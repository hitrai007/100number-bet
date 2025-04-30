import { sdk } from "@farcaster/frame-sdk";
import { useEffect, useState } from "react";

function App() {
  // State to hold multiple selected numbers
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  useEffect(() => {
    sdk.actions.ready();
  }, []);

  const handleNumberClick = (number: number) => {
    setSelectedNumbers(prevSelectedNumbers => {
      // Check if the number is already selected
      if (prevSelectedNumbers.includes(number)) {
        // If yes, remove it (deselect)
        return prevSelectedNumbers.filter(n => n !== number);
      } else {
        // If no, add it (select)
        return [...prevSelectedNumbers, number];
      }
    });
  };

  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);

  return (
    <div className="app-container">
      <div className="grid-container">
        {numbers.map((number) => (
          <button
            key={number}
            // Check if the current number is in the selectedNumbers array
            className={`grid-button ${
              selectedNumbers.includes(number) ? "selected" : ""
            }`}
            onClick={() => handleNumberClick(number)}
          >
            {number}
          </button>
        ))}
      </div>
      <div className="selected-number-display">
        {/* Display the count or the list of selected numbers */}
        Numbers Selected: {selectedNumbers.length > 0 ? selectedNumbers.join(", ") : "None"}
      </div>
    </div>
  );
}

export default App;