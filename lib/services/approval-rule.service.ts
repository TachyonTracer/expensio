import { prisma } from '../db';
import { 
  ApprovalRule, 
  ApprovalRuleType, 
  ApprovalRuleConfig,
  CreateApprovalRuleDto,
  UpdateApprovalRuleDto,
  ValidationError,
  ValidationErrorItem,
  BusinessRuleError
} from '../types';

export class ApprovalRuleService {
  /**
   * Create a new approval rule with validation
   */
  async createApprovalRule(
    companyId: string, 
    data: CreateApprovalRuleDto
  ): Promise<ApprovalRule> {
    // Validate rule configuration
    await this.validateRuleConfig(data.ruleType, data.ruleConfig, companyId);
    
    // Check for conflicts with existing rules
    await this.checkRuleConflicts(companyId, data);

    const rule = await prisma.approvalRule.create({
      data: {
        companyId,
        name: data.name,
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        category: data.category,
        ruleType: data.ruleType,
        ruleConfig: data.ruleConfig as any,
        isActive: data.isActive ?? true,
      },
    });

    return this.mapToApprovalRule(rule);
  }

  /**
   * Update an existing approval rule
   */
  async updateApprovalRule(
    id: string, 
    companyId: string, 
    data: UpdateApprovalRuleDto
  ): Promise<ApprovalRule> {
    const existingRule = await this.getApprovalRuleById(id, companyId);
    if (!existingRule) {
      throw new Error('Approval rule not found');
    }

    // If rule config is being updated, validate it
    if (data.ruleConfig || data.ruleType) {
      const ruleType = data.ruleType || existingRule.ruleType;
      const ruleConfig = data.ruleConfig || existingRule.ruleConfig;
      await this.validateRuleConfig(ruleType, ruleConfig, companyId);
    }

    // Check for conflicts if relevant fields are being updated
    if (data.minAmount !== undefined || data.maxAmount !== undefined || data.category !== undefined) {
      await this.checkRuleConflicts(companyId, {
        ...existingRule,
        ...data,
      }, id);
    }

    const updatedRule = await prisma.approvalRule.update({
      where: { id, companyId },
      data: {
        name: data.name,
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        category: data.category,
        ruleType: data.ruleType,
        ruleConfig: data.ruleConfig as any,
        isActive: data.isActive,
      },
    });

    return this.mapToApprovalRule(updatedRule);
  }

  /**
   * Get approval rule by ID
   */
  async getApprovalRuleById(id: string, companyId: string): Promise<ApprovalRule | null> {
    const rule = await prisma.approvalRule.findFirst({
      where: { id, companyId },
    });

    return rule ? this.mapToApprovalRule(rule) : null;
  }

  /**
   * Get all approval rules for a company
   */
  async getApprovalRulesByCompany(
    companyId: string, 
    includeInactive = false
  ): Promise<ApprovalRule[]> {
    const rules = await prisma.approvalRule.findMany({
      where: {
        companyId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [
        { minAmount: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return rules.map((rule: any) => this.mapToApprovalRule(rule));
  }

  /**
   * Delete an approval rule
   */
  async deleteApprovalRule(id: string, companyId: string): Promise<void> {
    // Check if rule is being used in any active workflows
    const activeApprovals = await prisma.approval.count({
      where: {
        step: {
          ruleId: id,
        },
        status: 'PENDING',
      },
    });

    if (activeApprovals > 0) {
      throw new BusinessRuleError({
        rule: 'RULE_IN_USE',
        message: 'Cannot delete approval rule that has pending approvals',
        context: { activeApprovals },
      });
    }

    await prisma.approvalRule.delete({
      where: { id, companyId },
    });
  }

  /**
   * Find matching approval rules for an expense
   */
  async findMatchingRules(
    companyId: string,
    amount: number,
    category: string
  ): Promise<ApprovalRule[]> {
    const rules = await prisma.approvalRule.findMany({
      where: {
        companyId,
        isActive: true,
        AND: [
          // Amount restrictions
          {
            OR: [
              // Rules with no amount restrictions
              { AND: [{ minAmount: null }, { maxAmount: null }] },
              // Rules where amount falls within range
              { 
                AND: [
                  { OR: [{ minAmount: null }, { minAmount: { lte: amount } }] },
                  { OR: [{ maxAmount: null }, { maxAmount: { gte: amount } }] },
                ]
              },
            ]
          },
          // Category restrictions
          {
            OR: [
              // Rules with no category restrictions
              { category: null },
              // Rules matching the specific category
              { category },
            ]
          },
        ],
      },
      orderBy: [
        { minAmount: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return rules.map((rule: any) => this.mapToApprovalRule(rule));
  }

  /**
   * Validate rule configuration based on rule type
   */
  private async validateRuleConfig(
    ruleType: ApprovalRuleType,
    ruleConfig: ApprovalRuleConfig,
    companyId: string
  ): Promise<void> {
    const errors: ValidationErrorItem[] = [];

    switch (ruleType) {
      case 'PERCENTAGE':
        if (!ruleConfig.requiredPercentage) {
          errors.push({
            field: 'ruleConfig.requiredPercentage',
            message: 'Required percentage must be specified for percentage-based rules',
            code: 'REQUIRED_FIELD',
          });
        } else if (ruleConfig.requiredPercentage < 1 || ruleConfig.requiredPercentage > 100) {
          errors.push({
            field: 'ruleConfig.requiredPercentage',
            message: 'Required percentage must be between 1 and 100',
            code: 'INVALID_RANGE',
          });
        }
        break;

      case 'SPECIFIC_APPROVER':
        if (!ruleConfig.specificApprovers || ruleConfig.specificApprovers.length === 0) {
          errors.push({
            field: 'ruleConfig.specificApprovers',
            message: 'At least one specific approver must be specified',
            code: 'REQUIRED_FIELD',
          });
        } else {
          // Validate that all specified approvers exist and belong to the company
          const approverIds = ruleConfig.specificApprovers;
          const validApprovers = await prisma.user.count({
            where: {
              id: { in: approverIds },
              companyId,
              isActive: true,
              role: { in: ['MANAGER', 'ADMIN'] },
            },
          });

          if (validApprovers !== approverIds.length) {
            errors.push({
              field: 'ruleConfig.specificApprovers',
              message: 'All specified approvers must be active managers or admins in the company',
              code: 'INVALID_APPROVERS',
            });
          }
        }
        break;

      case 'HYBRID':
        if (!ruleConfig.hybridRules) {
          errors.push({
            field: 'ruleConfig.hybridRules',
            message: 'Hybrid rules configuration must be specified',
            code: 'REQUIRED_FIELD',
          });
        } else {
          const { percentage, specificApprovers } = ruleConfig.hybridRules;
          
          if (!percentage || percentage < 1 || percentage > 100) {
            errors.push({
              field: 'ruleConfig.hybridRules.percentage',
              message: 'Percentage must be between 1 and 100',
              code: 'INVALID_RANGE',
            });
          }

          if (!specificApprovers || specificApprovers.length === 0) {
            errors.push({
              field: 'ruleConfig.hybridRules.specificApprovers',
              message: 'At least one specific approver must be specified for hybrid rules',
              code: 'REQUIRED_FIELD',
            });
          } else {
            // Validate specific approvers
            const validApprovers = await prisma.user.count({
              where: {
                id: { in: specificApprovers },
                companyId,
                isActive: true,
                role: { in: ['MANAGER', 'ADMIN'] },
              },
            });

            if (validApprovers !== specificApprovers.length) {
              errors.push({
                field: 'ruleConfig.hybridRules.specificApprovers',
                message: 'All specified approvers must be active managers or admins in the company',
                code: 'INVALID_APPROVERS',
              });
            }
          }
        }
        break;

      default:
        errors.push({
          field: 'ruleType',
          message: 'Invalid rule type',
          code: 'INVALID_ENUM',
        });
    }

    if (errors.length > 0) {
      throw new ValidationError({
        message: 'Rule configuration validation failed',
        errors,
      });
    }
  }

  /**
   * Check for conflicts with existing rules
   */
  private async checkRuleConflicts(
    companyId: string,
    ruleData: Partial<ApprovalRule> & { name: string },
    excludeRuleId?: string
  ): Promise<void> {
    // Check for duplicate rule names
    const existingRule = await prisma.approvalRule.findFirst({
      where: {
        companyId,
        name: ruleData.name,
        isActive: true,
        ...(excludeRuleId ? { id: { not: excludeRuleId } } : {}),
      },
    });

    if (existingRule) {
      throw new BusinessRuleError({
        rule: 'DUPLICATE_RULE_NAME',
        message: `An active approval rule with the name "${ruleData.name}" already exists`,
        context: { existingRuleId: existingRule.id },
      });
    }

    // Check for overlapping amount ranges in the same category
    if (ruleData.minAmount !== undefined || ruleData.maxAmount !== undefined || ruleData.category !== undefined) {
      const overlappingRules = await prisma.approvalRule.findMany({
        where: {
          companyId,
          isActive: true,
          ...(excludeRuleId ? { id: { not: excludeRuleId } } : {}),
          category: ruleData.category || null,
          OR: [
            // Check for overlapping ranges
            {
              AND: [
                { minAmount: { lte: ruleData.maxAmount || 999999999 } },
                { maxAmount: { gte: ruleData.minAmount || 0 } },
              ],
            },
            // Check for rules with no amount restrictions
            {
              AND: [
                { minAmount: null },
                { maxAmount: null },
              ],
            },
          ],
        },
      });

      if (overlappingRules.length > 0) {
        throw new BusinessRuleError({
          rule: 'OVERLAPPING_RULES',
          message: 'Approval rule conflicts with existing rules for the same category and amount range',
          context: { 
            conflictingRules: overlappingRules.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })) 
          },
        });
      }
    }
  }

  /**
   * Map database model to domain model
   */
  private mapToApprovalRule(rule: {
    id: string;
    companyId: string;
    name: string;
    minAmount: any;
    maxAmount: any;
    category: string | null;
    ruleType: ApprovalRuleType;
    ruleConfig: any;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ApprovalRule {
    return {
      id: rule.id,
      companyId: rule.companyId,
      name: rule.name,
      minAmount: rule.minAmount ? Number(rule.minAmount) : undefined,
      maxAmount: rule.maxAmount ? Number(rule.maxAmount) : undefined,
      category: rule.category || undefined,
      ruleType: rule.ruleType,
      ruleConfig: rule.ruleConfig,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}

export const approvalRuleService = new ApprovalRuleService();