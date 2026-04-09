import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AppDirectory from './pages/AppDirectory';
import AppDetail from './pages/AppDetail';
import Leaderboard from './pages/Leaderboard';
import BuilderProfile from './pages/BuilderProfile';
import Staleness from './pages/Staleness';
import SkillDownloads from './pages/SkillDownloads';
import Admin from './pages/Admin';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/apps" element={<AppDirectory />} />
        <Route path="/apps/:id" element={<AppDetail />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/builder/:email" element={<BuilderProfile />} />
        <Route path="/staleness" element={<Staleness />} />
        <Route path="/skills" element={<SkillDownloads />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Layout>
  );
}
