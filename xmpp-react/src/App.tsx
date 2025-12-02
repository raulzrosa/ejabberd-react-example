import "./App.css";
import XmppClient from "./XmppClient.jsx";

function App() {

  return (
    <div style={{ display: "flex" }}>
      <XmppClient id={1} />
      <XmppClient id={2} />
    </div>
  );
}

export default App;
