import { useEffect, useState } from 'react';
import { listSkills } from '../api';

interface Skill {
  tool: string;
  version: string;
  format: string;
  download_url: string;
  checksum: string;
  install_instructions: string;
  published_at: string;
}

const TOOL_INFO: Record<string, { name: string; description: string; color: string }> = {
  'claude-code': {
    name: 'Claude Code',
    description: 'Agent skill for Claude Code. Installs to ~/.claude/skills/',
    color: 'bg-orange-50 border-orange-200',
  },
  'cursor': {
    name: 'Cursor',
    description: 'Agent skill for Cursor. Installs to ~/.cursor/skills/',
    color: 'bg-blue-50 border-blue-200',
  },
  'codex': {
    name: 'OpenAI Codex',
    description: 'Agent skill for Codex with offline fallback. Installs to ~/.codex/skills/',
    color: 'bg-green-50 border-green-200',
  },
  'copilot': {
    name: 'GitHub Copilot',
    description: 'Copilot Extension via GitHub App + Skillset manifest.',
    color: 'bg-purple-50 border-purple-200',
  },
};

export default function SkillDownloads() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listSkills()
      .then((res) => setSkills(res.skills))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Skill Downloads</h1>
      <p className="text-gray-500 mb-6">Install the registration skill for your AI coding tool.</p>

      <div className="grid md:grid-cols-2 gap-6">
        {skills.map((skill) => {
          const info = TOOL_INFO[skill.tool] || { name: skill.tool, description: '', color: 'bg-gray-50 border-gray-200' };
          return (
            <div key={skill.tool} className={`rounded-lg border-2 p-6 ${info.color}`}>
              <h2 className="text-lg font-bold mb-1">{info.name}</h2>
              <p className="text-sm text-gray-600 mb-3">{info.description}</p>

              <div className="text-xs text-gray-500 space-y-1 mb-4">
                <p>Version: {skill.version}</p>
                <p>Format: {skill.format}</p>
                <p>Published: {new Date(skill.published_at).toLocaleDateString()}</p>
              </div>

              <div className="bg-white rounded-md p-3 mb-4">
                <p className="text-xs font-mono text-gray-700">{skill.install_instructions}</p>
              </div>

              <div className="flex gap-2">
                <a
                  href={`/api/v1/skills/${skill.tool}/download`}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
                >
                  Download ZIP
                </a>
                {skill.tool !== 'copilot' && (
                  <button
                    onClick={() => {
                      fetch(`/api/v1/skills/${skill.tool}/install-script`)
                        .then(r => r.text())
                        .then(text => navigator.clipboard.writeText(text))
                        .then(() => alert('Install script copied to clipboard!'));
                    }}
                    className="px-4 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50"
                  >
                    Copy Install Script
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {skills.length === 0 && (
          <p className="text-gray-400 col-span-2 text-center py-8">No skill packages available yet. Run the seed script to populate.</p>
        )}
      </div>
    </div>
  );
}
