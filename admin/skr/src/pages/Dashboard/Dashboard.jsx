import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import "./Dashboard.css";

const Dashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    withdrawn: 0,
    clients: 0,
  });
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("https://skr-project-backend.onrender.com/api/receipt/");
      const receipts = await response.json();

      const total = receipts.length;
      const active = receipts.filter(r => r.status === "Active").length;
      const withdrawn = receipts.filter(r => r.status === "Withdrawn").length;
      const clients = new Set(receipts.map(r => r.client?.email)).size;
      setStats({ total, active, withdrawn, clients });

      // Recent receipts
      const sortedReceipts = receipts.sort(
        (a, b) => new Date(b.depositDate) - new Date(a.depositDate)
      );
      setRecentReceipts(sortedReceipts.slice(0, 5));

      // Chart data by day (last 7 days)
      const today = new Date();
      const chartArray = [];
      for (let i = 6; i >= 0; i--) {
        const day = new Date(today);
        day.setDate(today.getDate() - i);
        const dayStr = day.toLocaleDateString("en-GB");
        const dayReceipts = receipts.filter(
          r => new Date(r.depositDate).toDateString() === day.toDateString()
        );
        chartArray.push({
          date: dayStr,
          Active: dayReceipts.filter(r => r.status === "Active").length,
          Withdrawn: dayReceipts.filter(r => r.status === "Withdrawn").length,
        });
      }
      setChartData(chartArray);

      // Pie chart status distribution
      setPieData([
        { name: "Active", value: active },
        { name: "Withdrawn", value: withdrawn },
      ]);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading-screen">Loading dashboard...</div>;

  const COLORS = ["#4caf50", "#f44336"];

  return (
    <div className="dashboard">
      <h2>Welcome, Admin</h2>

      {/* Stats Cards */}
      <div className="dashboard-cards">
        <div className="card">
          <h3>Total Receipts</h3>
          <p>{stats.total}</p>
        </div>
        <div className="card">
          <h3>Active</h3>
          <p>{stats.active}</p>
        </div>
        <div className="card">
          <h3>Withdrawn</h3>
          <p>{stats.withdrawn}</p>
        </div>
        <div className="card">
          <h3>Total Clients</h3>
          <p>{stats.clients}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="charts">
        <div className="chart">
          <h3>Receipts Over Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Active" fill="#4caf50" />
              <Bar dataKey="Withdrawn" fill="#f44336" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart">
          <h3>Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Receipts Table */}
      <div className="recent-receipts">
        <h3>Recent Receipts</h3>
        <table>
          <thead>
            <tr>
              <th>Tracking ID</th>
              <th>Client</th>
              <th>Status</th>
              <th>Deposit Date</th>
            </tr>
          </thead>
          <tbody>
            {recentReceipts.map(r => (
              <tr key={r.trackingId}>
                <td>{r.trackingId}</td>
                <td>{r.client?.name || "N/A"}</td>
                <td>
                  <span className={`status-badge ${r.status.toLowerCase()}`}>
                    {r.status}
                  </span>
                </td>
                <td>
                  {new Date(r.depositDate).toLocaleString("en-KE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
