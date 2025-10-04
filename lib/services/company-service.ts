import { prisma } from '@/lib/db';
import { CreateCompanyDto, CreateUserDto, UserRole } from '@/lib/types';
import { hashPassword } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email-utils';

export interface CompanySetupData {
  company: CreateCompanyDto;
  adminUser: {
    email: string;
    password: string;
  };
}

export interface CompanySetupResult {
  company: {
    id: string;
    name: string;
    country: string;
    baseCurrency: string;
    industry: string | null;
    employeeCount: string | null;
    timeZone: string | null;
  };
  adminUser: {
    id: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Creates a new company with an admin user in a single transaction
 */
export async function createCompanyWithAdmin(
  setupData: CompanySetupData
): Promise<CompanySetupResult> {
  // Validate that the admin email is not already in use
  const existingUser = await prisma.user.findUnique({
    where: { email: setupData.adminUser.email },
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Check if company name is already taken
  const existingCompany = await prisma.company.findFirst({
    where: { name: setupData.company.name },
  });

  if (existingCompany) {
    throw new Error('Company with this name already exists');
  }

  // Detect currency based on country
  let detectedCurrency = setupData.company.baseCurrency;
  
  try {
    const countryResponse = await fetch(
      `https://restcountries.com/v3.1/name/${setupData.company.country}?fields=name,currencies`
    );
    
    if (countryResponse.ok) {
      const countryData = await countryResponse.json();
      if (countryData && countryData[0] && countryData[0].currencies) {
        const currencies = Object.keys(countryData[0].currencies);
        if (currencies.length > 0) {
          detectedCurrency = currencies[0];
        }
      }
    }
  } catch (error) {
    console.warn('Failed to fetch country currency data:', error);
    // Continue with provided currency
  }

  // Create company and admin user in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the company
    const company = await tx.company.create({
      data: {
        name: setupData.company.name,
        country: setupData.company.country,
        baseCurrency: detectedCurrency,
        industry: setupData.company.industry ?? null,
        employeeCount: setupData.company.employeeCount ?? null,
        timeZone: setupData.company.timeZone ?? null,
      },
    });

    // Hash the admin password
    const hashedPassword = await hashPassword(setupData.adminUser.password);

    // Create the admin user
    const adminUser = await tx.user.create({
      data: {
        email: setupData.adminUser.email,
        password: hashedPassword,
        role: 'ADMIN',
        companyId: company.id,
        isActive: true,
      },
    });

    return { company, adminUser };
  });

  // Send welcome email to admin user (non-blocking)
  try {
    await sendWelcomeEmail(
      result.adminUser.email,
      result.company.name,
      setupData.adminUser.password
    );
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't fail the entire operation if email fails
  }

  return {
    company: {
      id: result.company.id,
      name: result.company.name,
      country: result.company.country,
      baseCurrency: result.company.baseCurrency,
      industry: result.company.industry,
      employeeCount: result.company.employeeCount,
      timeZone: result.company.timeZone,
    },
    adminUser: {
      id: result.adminUser.id,
      email: result.adminUser.email,
      role: result.adminUser.role,
    },
  };
}

/**
 * Fetches supported countries and their currencies
 */
export async function getSupportedCountries(): Promise<Array<{
  name: string;
  code: string;
  currencies: Array<{
    code: string;
    name: string;
    symbol: string;
  }>;
}>> {
  try {
    const response = await fetch(
      'https://restcountries.com/v3.1/all?fields=name,cca2,currencies'
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch countries data');
    }

    const countries = await response.json();
    
    return countries
      .map((country: any) => ({
        name: country.name.common,
        code: country.cca2,
        currencies: country.currencies
          ? Object.entries(country.currencies).map(([code, currency]: [string, any]) => ({
              code,
              name: currency.name,
              symbol: currency.symbol || code,
            }))
          : [],
      }))
      .filter((country: any) => country.currencies.length > 0)
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching countries:', error);
    // Return a fallback list of common countries
    return [
      {
        name: 'United States',
        code: 'US',
        currencies: [{ code: 'USD', name: 'US Dollar', symbol: '$' }],
      },
      {
        name: 'United Kingdom',
        code: 'GB',
        currencies: [{ code: 'GBP', name: 'British Pound', symbol: '£' }],
      },
      {
        name: 'Canada',
        code: 'CA',
        currencies: [{ code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' }],
      },
      {
        name: 'Australia',
        code: 'AU',
        currencies: [{ code: 'AUD', name: 'Australian Dollar', symbol: 'A$' }],
      },
      {
        name: 'Germany',
        code: 'DE',
        currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
      },
    ];
  }
}

/**
 * Updates company settings
 */
export async function updateCompanySettings(
  companyId: string,
  updates: Partial<CreateCompanyDto>
): Promise<{
  id: string;
  name: string;
  country: string;
  baseCurrency: string;
  industry: string | null;
  employeeCount: string | null;
  timeZone: string | null;
  updatedAt: Date;
}> {
  // Check if another company with the same name exists (if name is being updated)
  if (updates.name) {
    const existingCompany = await prisma.company.findFirst({
      where: {
        name: updates.name,
        id: { not: companyId },
      },
    });

    if (existingCompany) {
      throw new Error('Company with this name already exists');
    }
  }

  const data: Record<string, any> = { ...updates };

  if (updates.baseCurrency) {
    data.baseCurrency = updates.baseCurrency.toUpperCase();
  }

  if ('industry' in updates) {
    data.industry = updates.industry ?? null;
  }

  if ('employeeCount' in updates) {
    data.employeeCount = updates.employeeCount ?? null;
  }

  if ('timeZone' in updates) {
    data.timeZone = updates.timeZone ?? null;
  }

  const updatedCompany = await prisma.company.update({
    where: { id: companyId },
    data,
  });

  return {
    id: updatedCompany.id,
    name: updatedCompany.name,
    country: updatedCompany.country,
    baseCurrency: updatedCompany.baseCurrency,
    industry: updatedCompany.industry,
    employeeCount: updatedCompany.employeeCount,
    timeZone: updatedCompany.timeZone,
    updatedAt: updatedCompany.updatedAt,
  };
}

/**
 * Gets company statistics and overview
 */
export async function getCompanyOverview(companyId: string) {
  const [company, stats] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            users: true,
            expenses: true,
            approvalRules: true,
          },
        },
      },
    }),
  ]);

  if (!company || !stats) {
    throw new Error('Company not found');
  }

  // Get expense statistics
  const expenseStats = await prisma.expense.aggregate({
    where: { companyId },
    _sum: {
      convertedAmount: true,
    },
    _count: {
      id: true,
    },
  });

  // Get expenses by status
  const expensesByStatus = await prisma.expense.groupBy({
    by: ['status'],
    where: { companyId },
    _count: {
      id: true,
    },
  });

  return {
    company: {
      id: company.id,
      name: company.name,
      country: company.country,
      baseCurrency: company.baseCurrency,
      industry: company.industry,
      employeeCount: company.employeeCount,
      timeZone: company.timeZone,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    },
    users: company.users,
    statistics: {
      totalUsers: stats._count.users,
      totalExpenses: stats._count.expenses,
      totalApprovalRules: stats._count.approvalRules,
      totalExpenseAmount: expenseStats._sum.convertedAmount || 0,
      expensesByStatus: expensesByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
    },
  };
}