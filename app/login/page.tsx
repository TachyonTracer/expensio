import { redirect } from 'next/navigation';

function buildQueryString(searchParams: { [key: string]: string | string[] | undefined }): string {
  const query = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === 'undefined') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (typeof entry !== 'undefined') {
          query.append(key, entry);
        }
      });
    } else {
      query.append(key, value);
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

export default async function LoginAliasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  redirect(`/auth/login${buildQueryString(resolvedSearchParams)}`);
}
