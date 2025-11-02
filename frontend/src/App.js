import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import RoutesList from "./pages/RoutesList";
import AddRoute from "./pages/AddRoute";
import RouteMap from "./pages/RouteMap";

function App() {
  return (
    <Router>
      <div style={styles.page}>
        <header style={styles.header}>
          <h1 style={styles.title}>Preču piegādes sistēma</h1>
        </header>

        <main style={styles.content}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/routes" element={<RoutesList />} />
            <Route path="/add-route" element={<AddRoute />} />
            <Route path="/map/:id" element={<RouteMap />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

const styles = {
  page: {
    backgroundColor: "#f6f8fa",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  header: {
    padding: "20px 0",
    textAlign: "center",
  },
  title: {
    fontSize: "28px",
    fontWeight: "bold",
    margin: "0",
    color: "#222",
  },
  content: {
    flexGrow: 1,
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};

export default App;
