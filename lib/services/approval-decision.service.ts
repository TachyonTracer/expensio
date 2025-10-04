import { prisma } from '../db';
import { 
  ApprovalResult, 
  ApprovalDecisionDto,
  ApprovalStatus,
  BusinessRuleError,
  User
} from '../types';
import { approvalWorkflowService } from './approval-workflow.service';

export class ApprovalDecisionService {
  /**
   * Process an approval decision (approve or reject)
   */
  async processApprovalDecision(
    approvalId: string,
    approverId: string,
    decision: ApprovalDecisionDto
  ): Promise<ApprovalResult> {
    // Get the approval record
    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      include: {
        expense: true,
        step: {
          include: {
            rule: true,
          },
        },
        approver: true,
      },
    });

    if (!approval) {
      throw new Error('Approval not found');
    }

    // Verify the approver
    if (approval.approverId !== approverId) {
      throw new BusinessRuleError({
        rule: 'UNAUTHORIZED_APPROVER',
        message: 'You are not authorized to make this approval decision',
        context: { approvalId, approverId },
      });
    }

    // Check if approval is still pending
    if (approval.status !== 'PENDING') {
      throw new BusinessRuleError({
        rule: 'APPROVAL_ALREADY_PROCESSED',
        message: 'This approval has already been processed',
        context: { approvalId, currentStatus: approval.status },
      });
    }

    // Update the approval record
    const updatedApproval = await prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: decision.status as ApprovalStatus,
        comments: decision.comments,
        approvedAt: new Date(),
      },
    });

    // Get current workflow state
    const workflow = await approvalWorkflowService.getWorkflowState(approval.expenseId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Process workflow progression
    const workflowResult = await this.processWorkflowProgression(
      approval.expenseId,
      approval.step.rule,
      decision.status as ApprovalStatus
    );

    return {
      success: true,
      workflow: workflowResult.workflow,
      nextApprovers: workflowResult.nextApprovers,
      isWorkflowComplete: workflowResult.isWorkflowComplete,
      finalStatus: workflowResult.finalStatus,
    };
  }

  /**
   * Get pending approvals for a user
   */
  async getPendingApprovalsForUser(userId: string, companyId: string): Promise<any[]> {
    const pendingApprovals = await prisma.approval.findMany({
      where: {
        approverId: userId,
        status: 'PENDING',
        expense: {
          companyId,
        },
      },
      include: {
        expense: {
          include: {
            user: true,
          },
        },
        step: {
          include: {
            rule: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return pendingApprovals;
  }

  /**
   * Get approval history for an expense
   */
  async getApprovalHistory(expenseId: string): Promise<any[]> {
    const approvals = await prisma.approval.findMany({
      where: { expenseId },
      include: {
        approver: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        step: {
          include: {
            rule: {
              select: {
                id: true,
                name: true,
                ruleType: true,
              },
            },
          },
        },
      },
      orderBy: [
        { step: { stepOrder: 'asc' } },
        { createdAt: 'asc' },
      ],
    });

    return approvals;
  }

  /**
   * Process workflow progression after a decision
   */
  private async processWorkflowProgression(
    expenseId: string,
    rule: any,
    decision: ApprovalStatus
  ): Promise<{
    workflow: any;
    nextApprovers: User[];
    isWorkflowComplete: boolean;
    finalStatus?: 'APPROVED' | 'REJECTED';
  }> {
    // If rejected, workflow is complete
    if (decision === 'REJECTED') {
      await this.completeWorkflow(expenseId, 'REJECTED');
      const workflow = await approvalWorkflowService.getWorkflowState(expenseId);
      return {
        workflow,
        nextApprovers: [],
        isWorkflowComplete: true,
        finalStatus: 'REJECTED',
      };
    }

    // For approval, check if workflow should progress or complete
    const shouldComplete = await this.shouldCompleteWorkflow(expenseId, rule);
    
    if (shouldComplete.complete) {
      await this.completeWorkflow(expenseId, 'APPROVED');
      const workflow = await approvalWorkflowService.getWorkflowState(expenseId);
      return {
        workflow,
        nextApprovers: [],
        isWorkflowComplete: true,
        finalStatus: 'APPROVED',
      };
    }

    // Progress to next step if needed
    if (shouldComplete.progressToNext) {
      await this.progressToNextStep(expenseId);
    }

    const workflow = await approvalWorkflowService.getWorkflowState(expenseId);
    const nextApprovers = await approvalWorkflowService.getNextApprovers(expenseId);

    return {
      workflow,
      nextApprovers,
      isWorkflowComplete: false,
    };
  }

  /**
   * Determine if workflow should complete or progress
   */
  private async shouldCompleteWorkflow(
    expenseId: string,
    rule: any
  ): Promise<{ complete: boolean; progressToNext: boolean }> {
    const allApprovals = await prisma.approval.findMany({
      where: { expenseId },
      include: {
        step: true,
      },
      orderBy: {
        step: { stepOrder: 'asc' },
      },
    });

    // Group approvals by step
    const stepGroups = new Map<number, any[]>();
    allApprovals.forEach((approval: any) => {
      const stepOrder = approval.step.stepOrder;
      if (!stepGroups.has(stepOrder)) {
        stepGroups.set(stepOrder, []);
      }
      stepGroups.get(stepOrder)!.push(approval);
    });

    const sortedSteps = Array.from(stepGroups.keys()).sort((a, b) => a - b);
    
    // Check current step completion based on rule type
    for (let i = 0; i < sortedSteps.length; i++) {
      const stepOrder = sortedSteps[i];
      const stepApprovals = stepGroups.get(stepOrder)!;
      
      const pendingApprovals = stepApprovals.filter(approval => approval.status === 'PENDING');
      const approvedApprovals = stepApprovals.filter(approval => approval.status === 'APPROVED');
      
      // If this step has pending approvals, check if it's complete based on rule type
      if (pendingApprovals.length > 0) {
        const isStepComplete = this.isStepComplete(stepApprovals, rule);
        
        if (isStepComplete) {
          // Cancel remaining pending approvals in this step
          await this.cancelPendingApprovalsInStep(stepApprovals);
          
          // Check if this is the last step
          if (i === sortedSteps.length - 1) {
            return { complete: true, progressToNext: false };
          } else {
            return { complete: false, progressToNext: true };
          }
        } else {
          // Step is not complete, workflow continues
          return { complete: false, progressToNext: false };
        }
      }
      
      // If no pending approvals in this step, check if it was completed
      if (approvedApprovals.length > 0) {
        // Step is complete, continue to next step
        continue;
      }
    }

    // All steps are complete
    return { complete: true, progressToNext: false };
  }

  /**
   * Check if a step is complete based on rule type
   */
  private isStepComplete(stepApprovals: any[], rule: any): boolean {
    const approvedApprovals = stepApprovals.filter(approval => approval.status === 'APPROVED');
    const totalApprovals = stepApprovals.length;

    switch (rule.ruleType) {
      case 'PERCENTAGE':
        const requiredPercentage = rule.ruleConfig.requiredPercentage || 100;
        const approvedPercentage = (approvedApprovals.length / totalApprovals) * 100;
        return approvedPercentage >= requiredPercentage;

      case 'SPECIFIC_APPROVER':
        // All specific approvers must approve
        const requiredApprovers = rule.ruleConfig.specificApprovers || [];
        const approvedApproverIds = approvedApprovals.map((approval: any) => approval.approverId);
        return requiredApprovers.every((approverId: string) => approvedApproverIds.includes(approverId));

      case 'HYBRID':
        const hybridRules = rule.ruleConfig.hybridRules;
        if (!hybridRules) return false;

        // Check if specific approvers have approved
        const specificApprovers = hybridRules.specificApprovers || [];
        const approvedSpecificApprovers = approvedApprovals.filter((approval: any) => 
          specificApprovers.includes(approval.approverId)
        );

        // If any specific approver approved, workflow can complete
        if (approvedSpecificApprovers.length > 0) {
          return true;
        }

        // Otherwise, check percentage
        const hybridPercentage = hybridRules.percentage || 100;
        const currentPercentage = (approvedApprovals.length / totalApprovals) * 100;
        return currentPercentage >= hybridPercentage;

      default:
        return false;
    }
  }

  /**
   * Cancel pending approvals in a step
   */
  private async cancelPendingApprovalsInStep(stepApprovals: any[]): Promise<void> {
    const pendingApprovalIds = stepApprovals
      .filter(approval => approval.status === 'PENDING')
      .map(approval => approval.id);

    if (pendingApprovalIds.length > 0) {
      await prisma.approval.updateMany({
        where: {
          id: { in: pendingApprovalIds },
        },
        data: {
          status: 'APPROVED', // Mark as approved since step is complete
          approvedAt: new Date(),
          comments: 'Auto-approved due to rule completion',
        },
      });
    }
  }

  /**
   * Progress workflow to next step
   */
  private async progressToNextStep(expenseId: string): Promise<void> {
    const workflow = await approvalWorkflowService.getWorkflowState(expenseId);
    if (!workflow) return;

    const nextStepIndex = workflow.currentStepIndex + 1;
    if (nextStepIndex >= workflow.steps.length) return;

    // Create approvals for next step
    const nextStepApprovers = workflow.steps.filter(step => step.stepOrder === nextStepIndex + 1);
    
    await Promise.all(
      nextStepApprovers.map(step =>
        prisma.approval.create({
          data: {
            expenseId,
            stepId: step.id,
            approverId: step.approverId,
            status: 'PENDING',
          },
        })
      )
    );
  }

  /**
   * Complete workflow and update expense status
   */
  private async completeWorkflow(expenseId: string, finalStatus: 'APPROVED' | 'REJECTED'): Promise<void> {
    await prisma.expense.update({
      where: { id: expenseId },
      data: {
        status: finalStatus,
      },
    });

    // TODO: Send notifications to relevant users
    // This would be implemented in a separate notification service
  }
}

export const approvalDecisionService = new ApprovalDecisionService();