import React, { useState } from 'react';
import rockImage from './assets/rock.png';
import paperImage from './assets/paper.png';
import scissorsImage from './assets/scissors.png';

const choices = [
  { name: 'rock', image: rockImage },
  { name: 'paper', image: paperImage },
  { name: 'scissors', image: scissorsImage },
];

const App = () => {
  const [playerChoice, setPlayerChoice] = useState(null);
  const [computerChoice, setComputerChoice] = useState(null);
  const [result, setResult] = useState(null);

  const handleChoice = (choice) => {
    const computerChoice = choices[Math.floor(Math.random() * choices.length)];
    setPlayerChoice(choice);
    setComputerChoice(computerChoice);
    setResult(getResult(choice.name, computerChoice.name));

    // Add a slight delay before resetting the choices
    setTimeout(() => {
      setPlayerChoice(null);
      setComputerChoice(null);
    }, 2000);
  };

  const getResult = (playerChoice, computerChoice) => {
    if (playerChoice === computerChoice) {
      return "It's a tie!";
    } else if (
      (playerChoice === 'rock' && computerChoice === 'scissors') ||
      (playerChoice === 'paper' && computerChoice === 'rock') ||
      (playerChoice === 'scissors' && computerChoice === 'paper')
    ) {
      return 'You win!';
    } else {
      return 'Computer wins!';
    }
  };

  return (
    <div className="App">
      <h1>Rock, Paper, Scissors</h1>
      <div className="choices">
        {choices.map((choice) => (
          <button key={choice.name} onClick={() => handleChoice(choice)}>
            <img src={choice.image} alt={choice.name} />
          </button>
        ))}
      </div>
      {playerChoice && (
        <div className="result">
          <p>You chose: {playerChoice.name}</p>
          <p>Computer chose: {computerChoice.name}</p>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
};

export default App;
