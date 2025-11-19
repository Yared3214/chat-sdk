import React, { useEffect, useState } from "react";
import { DMChat } from "@chat-sdk/chat-ui-web";
import { SocketClient } from "@chat-sdk/sdk-web";
import Login from "./Login";

function App() {
  const [client, setClient] = useState<SocketClient | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(()=>{
    if (userId) console.log(userId)
  })

  if (!client || !userId) {
    return (
      <Login
        onLogin={(c, id) => {
          setClient(c);
          setUserId(id);
        }}
      />
    );
  }

  

  return (
    <div className="h-full flex flex-col">
      <DMChat client={client} currentUserId={userId}/>
    </div>
  );
}

export default App;
