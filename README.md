
Name of Project "Expensio" – Project Spec Prompt
Overview

Develop a Smart Expense Management System to streamline employee reimbursements by replacing manual, error-prone processes with an automated and transparent workflow. The system should support multi-level approvals, conditional rules, real-time currency conversion, and OCR-powered receipt scanning. It must provide role-based access and clear dashboards for employees, managers, and admins.

Key Requirements
1. User & Company Setup

On first signup, auto-create a Company with default currency based on the selected country.

Create an Admin-user automatically which is the company.

Admin can:

Add and manage employees and managers.

Assign roles (Employee, Manager).

Define reporting relationships.

2. Authentication & Roles

Admin: Manage users, roles, approval rules, view all expenses, override approvals.

Manager: Review, approve, or reject expenses. View team submissions.

Employee: Submit expenses, view personal expense history, track approval status.

3. Expense Submission

Employees can submit expenses with:

Amount (supports multi-currency, auto-converts to company currency).

Category, description, date, and receipt attachment.

OCR automatically extracts fields (amount, date, vendor, etc.) from receipts.

4. Approval Workflow

Support sequential approvals (e.g., Manager → Director → CFO ).

Approval rules:

Percentage rule: Expense is approved if a set percentage of approvers approve.

Specific approver rule: If CFO approves expense can auto-approve no need for other approvals.

Hybrid rule: Combination of both.

Workflow progresses to the next approver only after the current one approves/rejects.

5. Currency Management

Fetch country and currency data via REST API. 
for currency rate-https://api.exchangerate-api.com/v4/latest/{BASE_CURRENCY}
for country currency - https://restcountries.com/v3.1/all?fields=name,currencies
Convert expense amounts into company currency using real-time exchange rates.

6. Dashboards & Transparency

Employee Dashboard: Submitted expenses, status tracking, approval history.

Manager Dashboard: Pending approvals, team expenses.

Admin Dashboard: Company-wide expense overview, rule management.

Tech Stack

Frontend Framework: Next.js

Database: PostgreSQL

Language: TypeScript

Styling: TailwindCSS

Animations: GSAP, ParticalJs

Use Breadcrum for naigation showing and make it resposive for both mobile and desktop
Additional Integration: OCR library (e.g., Tesseract.js), external APIs for country/currency and exchange rates.