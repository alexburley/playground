import Result from "true-myth/result";

type ModelItem = { id: string; verified: boolean };
const AccessToken = () => "foobar";

type RepositoryItemNotFound = { cause: "not_found" };
type RepositoryAccessError = { cause: "db_error" };
type RepositoryError = RepositoryItemNotFound | RepositoryAccessError;
class DBAdapter {
  async get(id: string): Promise<Result<ModelItem, RepositoryError>> {
    if (id === "1")
      return Result.ok({
        id,
        verified: false,
      }); // 401
    if (id === "2")
      Result.err(
        new Error(`User with ID ${id} could not be found`, {
          cause: "not_found",
        })
      ); // 404
    if (id === "3")
      Result.err(
        new Error("There was an error accessing the database", {
          cause: "db_error",
        })
      ); // 503
    if (id === "4") (id as any).foobar.fizz; // 500 - force unhandled
    return Result.ok({
      id,
      verified: true,
    }); // 200
  }
}

type DomainError = RepositoryError | { cause: "user_not_verified" };
class DomainAdapter {
  db = new DBAdapter();

  async loginUserOne(
    id: string
  ): Promise<Result<{ token: string }, DomainError>> {
    const result = await this.db.get(id);
    return result.match({
      Ok: (user) => {
        if (!user.verified)
          return Result.err({
            cause: "user_not_verified",
          });
        return Result.ok({ token: AccessToken() });
      },
      Err: (err) => Result.err(err),
    });
  }
}

type HTTPResponse =
  | { status: number; result?: string }
  | { status: number; error?: string };

export class HTTPEndpoint {
  async handleLogin(id: string): Promise<HTTPResponse> {
    try {
      const domain = new DomainAdapter();
      const result = await domain.loginUserOne(id);
      return result.match({
        Ok: (user): HTTPResponse => {
          return { status: 200, result: user.token };
        },
        Err: (err) => {
          if (err.cause === "user_not_verified")
            return { status: 401, error: "User not verified" };
          if (err.cause === "not_found")
            return { status: 404, error: "User not found" };
          if (err.cause === "db_error")
            return { status: 503, error: "Database error" };
          throw new Error("unknown cause");
        },
      });
    } catch (err: any) {
      // This would be a global error handler
      return { status: 500, error: err.message };
    }
  }
}

["1", "2", "3", "4", "5"].forEach(async (id) => {
  const endpoint = new HTTPEndpoint();
  const result = await endpoint.handleLogin(id);
  console.log("ID", result);
});
