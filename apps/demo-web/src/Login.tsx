import React, { useState } from "react";
import { SocketClient } from "@chat-sdk/sdk-web";

const Login = ({ onLogin }: { onLogin: (c: SocketClient, id: string) => void }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const client = new SocketClient({ serverUrl: "http://10.25.241.192:3000", appId: 'c83f64f8-5bac-4a3b-a2d6-47caef86ec26' });
    const res = await client.login(username, password);
    await client.connect(res.access_token);
    onLogin(client, res.user.id); // use username as id for demo
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md w-96 space-y-4">
        <h1 className="text-lg font-bold">Login</h1>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 text-white px-3 py-2 rounded"
        >
          Login
        </button>
      </div>
    </div>
  );
};

export default Login;
