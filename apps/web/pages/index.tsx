import React from 'react';

export default function Web() {
  const [apiResp, setResp] = React.useState('');

  async function handleClick() {
    await fetch('http://localhost:6001').then((x) =>
      x.text().then((t) => setResp(t))
    );
    debugger;
  }

  return (
    <div>
      <h1>Web</h1>
      <button onClick={handleClick}>CLICK</button>
      <div> {apiResp} </div>
    </div>
  );
}
