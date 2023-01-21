type ModelItem = { id: string; verified: boolean };
const AccessToken = () => "foobar";

class DBAdapter {
  async get(id: string): Promise<ModelItem> {
    if (id === "1")
      return {
        id,
        verified: false,
      }; // 401
    if (id === "2") throw new Error("User not found"); // 404
    if (id === "3") throw new Error("Database Error"); // 503
    if (id === "4") (id as any).foobar.fizz; // 500
    return {
      id,
      verified: true,
    }; // 200
  }

  save(item: ModelItem): void {}
}

class DomainAdapter {
  db = new DBAdapter();

  async loginUser(id: string): Promise<{ token: string }> {
    const user = await this.db.get(id);
    if (!user.verified) {
      throw new Error("User not verified");
    }

    return { token: AccessToken() };
  }
}

class HTTPEndpoint {
  async handleLogin(
    id: string
  ): Promise<
    { status: number; result: string } | { status: number; error: string }
  > {
    const domain = new DomainAdapter();
    try {
      const { token } = await domain.loginUser(id);
      return { status: 200, result: token };
    } catch (e: any) {
      return { status: 500, error: e.message };
    }
  }
}

["1", "2", "3", "4", "5"].forEach(async (id) => {
  const endpoint = new HTTPEndpoint();
  const result = await endpoint.handleLogin(id);
  console.log("ID", result);
});
