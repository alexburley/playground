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
}

class DomainAdapter {
  db = new DBAdapter();

  async loginUser(id: string): Promise<{ token: string }> {
    try {
      const user = await this.db.get(id);
      if (!user.verified) {
        throw new Error("UserNotVerified");
      }
      return { token: AccessToken() };
    } catch (err: any) {
      if (err.message === "User not found") {
        throw new Error("UserNotFound");
      }
      if (err.message === "Database Error") {
        throw new Error("DBError");
      }
      throw err;
    }
  }
}

export class HTTPEndpoint {
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
      if (e.message === "UserNotVerified")
        return { status: 401, error: e.message };
      if (e.message === "UserNotFound")
        return { status: 404, error: e.message };
      if (e.message === "DBError") return { status: 503, error: e.message };
      return { status: 500, error: e.message };
    }
  }
}

["1", "2", "3", "4", "5"].forEach(async (id) => {
  const endpoint = new HTTPEndpoint();
  const result = await endpoint.handleLogin(id);
  console.log("ID", result);
});
