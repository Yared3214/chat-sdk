import { LoginResponse, CreateUserResponse } from "../types";

export async function loginWithCredentials(
    baseUrl: string,
    appId: string, 
    username: string, 
    password: string
  ): Promise<LoginResponse> {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appId,  // pulled from constructor
        username,
        password,
      }),
    });
  
    if (!response.ok) throw new Error("Login failed");
  
    const { token } = await response.json();
    return token;
  }

  export async function createUser(
    baseUrl: string,
    appId: string,
    username: string, 
    password: string, 
    // metadata: Record<string, any> = {}
  ): Promise<CreateUserResponse> {
    const response = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appId,
        username,
        password,
        // metadata,
      }),
    });
  
    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.statusText}`);
    }
  
    return response.json(); // { userId, username, createdAt }
  }
  