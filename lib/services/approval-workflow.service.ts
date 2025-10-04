import { prisma } from '../db';
import { 
  ApprovalWorkflow, 
  ApprovalStep, 
  ApprovalRule,
  ApprovalRuleType,
  User,
  Expense,
  BusinessRuleError
} from '../types';
import { approvalRuleService } from './approval-rule.service';

export class ApprovalWorkflowService {
  /**
   * Initiate approval workflow for an expense
   */
  async initiateWorkflow(expenseId: string): Promise<ApprovalWorkflow> {
    const expense = await this.getExpenseWithDetails(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // Find matching approval rules
    const matchingRules = await approvalRuleService.findMatchingRules(
      expense.companyId,
      expense.convertedAmount,
      expense.category
    );

    if (matchingRules.length === 0) {
      throw new BusinessRuleError({
        rule: 'NO_MATCHING_RULES',
        message: 'No approval rules match this expense',
        context: { expenseId, amount: expense.convertedAmount, category: expense.category },
      });
    }

    // Use the first matching rule (rules are ordered by priority)
    const selectedRule = matchingRules[0];
    
    // Generate approval steps based on the rule
    const steps = await this.generateApprovalSteps(selectedRule, expense);
    
    // Create approval steps in database
    const createdSteps = await this.createApprovalSteps(selectedRule.id, steps);
    
    // Create initial approvals for the first step
    await this.createInitialApprovals(expenseId, createdSteps);
    
    // Update expense status
    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: 'PENDING_APPROVAL' },
    });

    return {
      id: `workflow_${expenseId}`,
      expenseId,
      steps: createdSteps,
      currentStepIndex: 0,
      isComplete: false,
    };
  }

  /**
   * Get current workflow state for an expense
   */
  async getWorkflowState(expenseId: string): Promise<ApprovalWorkflow | null> {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        approvals: {
          include: {
            step: {
              include: {
                rule: true,
                approver: true,
              },
            },
            approver: true,
          },
          orderBy: {
            step: {
              stepOrder: 'asc',
            },
          },
        },
      },
    });

    if (!expense || expense.approvals.length === 0) {
      return null;
    }

    // Group approvals by step
    const stepMap = new Map<string, any[]>();
    expense.approvals.forEach((approval: any) => {
      const stepId = approval.stepId;
      if (!stepMap.has(stepId)) {
        stepMap.set(stepId, []);
      }
      stepMap.get(stepId)!.push(approval);
    });

    // Build workflow steps
    const steps: ApprovalStep[] = [];
    const uniqueSteps = Array.from(new Set(expense.approvals.map((a: any) => a.step.id)))
      .map(stepId => expense.approvals.find((a: any) => a.step.id === stepId)!.step)
      .sort((a, b) => a.stepOrder - b.stepOrder);

    uniqueSteps.forEach(step => {
      steps.push({
        id: step.id,
        ruleId: step.ruleId,
        stepOrder: step.stepOrder,
        approverId: step.approverId,
        approverType: step.approverType,
        isRequired: step.isRequired,
        createdAt: step.createdAt,
      });
    });

    // Determine current step and completion status
    const currentStepIndex = this.getCurrentStepIndex(expense.approvals);
    const isComplete = this.isWorkflowComplete(expense.approvals);
    const finalStatus = isComplete ? this.getFinalStatus(expense.approvals) : undefined;

    return {
      id: `workflow_${expenseId}`,
      expenseId,
      steps,
      currentStepIndex,
      isComplete,
      finalStatus,
    };
  }

  /**
   * Get next approvers for the current step
   */
  async getNextApprovers(expenseId: string): Promise<User[]> {
    const workflow = await this.getWorkflowState(expenseId);
    if (!workflow || workflow.isComplete) {
      return [];
    }

    const currentStep = workflow.steps[workflow.currentStepIndex];
    if (!currentStep) {
      return [];
    }

    // Get pending approvals for current step
    const pendingApprovals = await prisma.approval.findMany({
      where: {
        expenseId,
        stepId: currentStep.id,
        status: 'PENDING',
      },
      include: {
        approver: true,
      },
    });

    return pendingApprovals.map((approval: any) => ({
      id: approval.approver.id,
      companyId: approval.approver.companyId,
      email: approval.approver.email,
      password: approval.approver.password,
      role: approval.approver.role,
      managerId: approval.approver.managerId,
      isActive: approval.approver.isActive,
      createdAt: approval.approver.createdAt,
      updatedAt: approval.approver.updatedAt,
    }));
  }

  /**
   * Check if workflow is complete
   */
  async checkWorkflowCompletion(expenseId: string): Promise<boolean> {
    const workflow = await this.getWorkflowState(expenseId);
    return workflow?.isComplete || false;
  }

  /**
   * Generate approval steps based on rule configuration
   */
  private async generateApprovalSteps(rule: ApprovalRule, expense: Expense): Promise<Omit<ApprovalStep, 'id' | 'createdAt'>[]> {
    const steps: Omit<ApprovalStep, 'id' | 'createdAt'>[] = [];

    switch (rule.ruleType) {
      case 'PERCENTAGE':
        // For percentage-based rules, get all eligible approvers
        const eligibleApprovers = await this.getEligibleApprovers(expense.companyId, expense.userId);
        eligibleApprovers.forEach((approver, index) => {
          steps.push({
            ruleId: rule.id,
            stepOrder: index + 1,
            approverId: approver.id,
            approverType: 'USER',
            isRequired: true,
          });
        });
        break;

      case 'SPECIFIC_APPROVER':
        // For specific approver rules, create steps for each specified approver
        if (rule.ruleConfig.specificApprovers) {
          rule.ruleConfig.specificApprovers.forEach((approverId, index) => {
            steps.push({
              ruleId: rule.id,
              stepOrder: index + 1,
              approverId,
              approverType: 'USER',
              isRequired: true,
            });
          });
        }
        break;

      case 'HYBRID':
        // For hybrid rules, combine percentage and specific approvers
        if (rule.ruleConfig.hybridRules) {
          const { specificApprovers } = rule.ruleConfig.hybridRules;
          const eligibleApprovers = await this.getEligibleApprovers(expense.companyId, expense.userId);
          
          // Add specific approvers first
          specificApprovers.forEach((approverId, index) => {
            steps.push({
              ruleId: rule.id,
              stepOrder: index + 1,
              approverId,
              approverType: 'USER',
              isRequired: true,
            });
          });

          // Add other eligible approvers for percentage calculation
          const otherApprovers = eligibleApprovers.filter(
            approver => !specificApprovers.includes(approver.id)
          );
          otherApprovers.forEach((approver, index) => {
            steps.push({
              ruleId: rule.id,
              stepOrder: specificApprovers.length + index + 1,
              approverId: approver.id,
              approverType: 'USER',
              isRequired: false, // Not required for percentage calculation
            });
          });
        }
        break;
    }

    return steps;
  }

  /**
   * Get eligible approvers for an expense (managers and admins, excluding the submitter)
   */
  private async getEligibleApprovers(companyId: string, excludeUserId: string): Promise<User[]> {
    const approvers = await prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
        role: { in: ['MANAGER', 'ADMIN'] },
        id: { not: excludeUserId },
      },
      orderBy: [
        { role: 'desc' }, // Admins first, then managers
        { createdAt: 'asc' },
      ],
    });

    return approvers.map((user: any) => ({
      id: user.id,
      companyId: user.companyId,
      email: user.email,
      password: user.password,
      role: user.role,
      managerId: user.managerId,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  /**
   * Create approval steps in database
   */
  private async createApprovalSteps(ruleId: string, steps: Omit<ApprovalStep, 'id' | 'createdAt'>[]): Promise<ApprovalStep[]> {
    const createdSteps = await Promise.all(
      steps.map(step =>
        prisma.approvalStep.create({
          data: {
            ruleId,
            stepOrder: step.stepOrder,
            approverId: step.approverId,
            approverType: step.approverType,
            isRequired: step.isRequired,
          },
        })
      )
    );

    return createdSteps.map((step: any) => ({
      id: step.id,
      ruleId: step.ruleId,
      stepOrder: step.stepOrder,
      approverId: step.approverId,
      approverType: step.approverType,
      isRequired: step.isRequired,
      createdAt: step.createdAt,
    }));
  }

  /**
   * Create initial approvals for the first step
   */
  private async createInitialApprovals(expenseId: string, steps: ApprovalStep[]): Promise<void> {
    if (steps.length === 0) return;

    // Create approvals for the first step only
    const firstStepApprovers = steps.filter(step => step.stepOrder === 1);
    
    await Promise.all(
      firstStepApprovers.map(step =>
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
   * Get expense with necessary details
   */
  private async getExpenseWithDetails(expenseId: string): Promise<Expense | null> {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) return null;

    return {
      id: expense.id,
      companyId: expense.companyId,
      userId: expense.userId,
      originalAmount: Number(expense.originalAmount),
      originalCurrency: expense.originalCurrency,
      convertedAmount: Number(expense.convertedAmount),
      baseCurrency: expense.baseCurrency,
      exchangeRate: Number(expense.exchangeRate),
      category: expense.category,
      description: expense.description,
      expenseDate: expense.expenseDate,
      status: expense.status,
      receiptId: expense.receiptId,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }

  /**
   * Determine current step index based on approvals
   */
  private getCurrentStepIndex(approvals: any[]): number {
    if (approvals.length === 0) return 0;

    // Group approvals by step order
    const stepGroups = new Map<number, any[]>();
    approvals.forEach(approval => {
      const stepOrder = approval.step.stepOrder;
      if (!stepGroups.has(stepOrder)) {
        stepGroups.set(stepOrder, []);
      }
      stepGroups.get(stepOrder)!.push(approval);
    });

    // Find the first step that is not complete
    const sortedSteps = Array.from(stepGroups.keys()).sort((a, b) => a - b);
    
    for (let i = 0; i < sortedSteps.length; i++) {
      const stepOrder = sortedSteps[i];
      const stepApprovals = stepGroups.get(stepOrder)!;
      
      // Check if this step is complete
      const hasRejection = stepApprovals.some(approval => approval.status === 'REJECTED');
      if (hasRejection) {
        return i; // Workflow stopped at this step due to rejection
      }

      const pendingApprovals = stepApprovals.filter(approval => approval.status === 'PENDING');
      if (pendingApprovals.length > 0) {
        return i; // This step is still pending
      }
    }

    // All steps are complete
    return sortedSteps.length - 1;
  }

  /**
   * Check if workflow is complete based on approvals
   */
  private isWorkflowComplete(approvals: any[]): boolean {
    if (approvals.length === 0) return false;

    // Check if any approval is rejected
    const hasRejection = approvals.some(approval => approval.status === 'REJECTED');
    if (hasRejection) return true;

    // Check if all required approvals are approved
    const pendingApprovals = approvals.filter(approval => approval.status === 'PENDING');
    return pendingApprovals.length === 0;
  }

  /**
   * Get final status of workflow
   */
  private getFinalStatus(approvals: any[]): 'APPROVED' | 'REJECTED' | undefined {
    if (approvals.length === 0) return undefined;

    // Check if any approval is rejected
    const hasRejection = approvals.some(approval => approval.status === 'REJECTED');
    if (hasRejection) return 'REJECTED';

    // Check if all required approvals are approved
    const pendingApprovals = approvals.filter(approval => approval.status === 'PENDING');
    if (pendingApprovals.length === 0) return 'APPROVED';

    return undefined;
  }
}

export const approvalWorkflowService = new ApprovalWorkflowService();