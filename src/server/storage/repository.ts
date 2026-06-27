export type RepositoryHealth = {
  ok: boolean;
  checkedAt: string;
};

export async function getRepositoryHealth(): Promise<RepositoryHealth> {
  return {
    ok: true,
    checkedAt: new Date().toISOString()
  };
}
