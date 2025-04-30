import { sdk } from "@farcaster/frame-sdk";
import { useEffect, useState } from "react";

function App() {
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);

  useEffect(() => {
    sdk.actions.ready();
  }, []);

  const handleNumberClick = (number: number) => {
    setSelectedNumber(number);
    // Potentially add logic here to interact with the primary button if needed
    // e.g., enable it and set its text
    // sdk.actions.setPrimaryButton({ text: `Select ${number}`, enabled: true });
  };

  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);

  return (
    <div className="app-container">
      <div className="grid-container">
        {numbers.map((number) => (
          <button
            key={number}
            className={`grid-button ${
              selectedNumber === number ? "selected" : ""
            }`}
            onClick={() => handleNumberClick(number)}
          >
            {number}
          </button>
        ))}
      </div>
      <div className="selected-number-display">
        Numbers Selected: {selectedNumber !== null ? selectedNumber : "None"}
      </div>
    </div>
  );
}

export default App;