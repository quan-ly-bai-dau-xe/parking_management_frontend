import React from "react";
import HelloWorld from "./components/HelloWorld";
import { mockHelloData } from "./mocks/helloData";

function App() {
  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <HelloWorld data={mockHelloData} />
    </div>
  );
}

export default App;
