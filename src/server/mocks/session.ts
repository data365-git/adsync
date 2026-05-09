import { MOCK_USER } from "./data";

export type MockSession = {
  user: typeof MOCK_USER;
  expires: string;
};

export function getMockSession(): MockSession {
  return { user: MOCK_USER, expires: "2099-01-01" };
}
