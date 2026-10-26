export async function requestJson(
  url: string,
  options: RequestInit,
  errorMessage: string
): Promise<unknown> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(errorMessage);
  }

  try {
    return await response.json() as unknown;
  } catch (error) {
    throw new Error(errorMessage, { cause: error });
  }
}
