import "./App.css";
import CodeReviewDetail from "./pages/reviewDetail/CodeReviewDetail";

function App() {
  const test = {
    number: 45,
    title: "test",
    user: {
      login: "string",
      avatar_url: "string",
    },
    body: "string",
    state: "string",
  };
  return (
    <>
      <CodeReviewDetail pullRequest={test} />
    </>
  );
}

export default App;
