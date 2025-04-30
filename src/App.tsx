import { sdk } from "@farcaster/frame-sdk";
import { useEffect } from "react";

function App() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <>
      <label htmlFor="number-input">Choose a number from 1-100</label>
      <input id="number-input" type="number" min="1" max="100" />
    </>
  );
}

export default App;
