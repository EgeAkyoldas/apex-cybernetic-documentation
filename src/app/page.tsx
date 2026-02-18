"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Zap, FileText, X } from "lucide-react";
import { SessionCard } from "@/components/SessionCard";
import {
  getSessions,
  saveSession,
  deleteSession,
  createSession,
  Session,
} from "@/lib/storage";

export default function DashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    getSessions().then(setSessions);
  }, []);

  const handleCreate = async () => {
    if (!projectName.trim()) return;
    const session = createSession(projectName.trim(), "master");
    await saveSession(session);
    router.push(`/session/${session.id}`);
  };

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    setSessions(await getSessions());
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border glass-dark sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="font-mono font-bold text-foreground text-sm">PRD Creator</h1>
              <p className="text-xs text-muted-foreground">AI Document Factory</p>
            </div>
          </div>
          <motion.button
            onClick={() => setShowNewModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-cyber-dark font-mono font-semibold text-sm hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            New Project
          </motion.button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            <div className="w-20 h-20 rounded-2xl bg-secondary border border-border flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="font-mono font-bold text-2xl text-foreground mb-3">No Projects Yet</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Create your first project to start generating professional documentation with AI.
            </p>
            <motion.button
              onClick={() => setShowNewModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 text-cyber-dark font-mono font-semibold hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-5 h-5" />
              Create First Project
            </motion.button>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-mono font-semibold text-foreground">
                Projects{" "}
                <span className="text-muted-foreground font-normal">({sessions.length})</span>
              </h2>
            </div>
            <div className="grid gap-3">
              {sessions.map((session, i) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <SessionCard
                    session={session}
                    onOpen={(id) => router.push(`/session/${id}`)}
                    onDelete={handleDelete}
                  />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* New Project Modal */}
      <AnimatePresence>
        {showNewModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20"
              onClick={() => setShowNewModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-30 flex items-center justify-center p-4"
            >
              <div className="glass rounded-2xl border border-border w-full max-w-md shadow-2xl">
                {/* Modal header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <div>
                    <h2 className="font-mono font-bold text-foreground">New Project</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Generate any document type from within the session
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNewModal(false)}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6">
                  <label className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    placeholder="e.g. TaskFlow — Team Productivity App"
                    autoFocus
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-sans"
                  />

                  {/* Available doc types hint */}
                  <div className="mt-4 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                    <p className="text-xs font-mono text-cyan-400/70 mb-1.5">Available document types:</p>
                    <div className="flex flex-wrap gap-1">
                      {["PRD", "Design", "Tech Stack", "Architecture", "Tech Spec", "Roadmap", "API Spec", "UI Design", "Task List"].map((t) => (
                        <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400/80">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 pt-0">
                  <button
                    onClick={() => setShowNewModal(false)}
                    className="flex-1 py-2.5 rounded-lg border border-border text-sm font-mono text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={handleCreate}
                    disabled={!projectName.trim()}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="flex-1 py-2.5 rounded-lg bg-cyan-500 text-cyber-dark font-mono font-semibold text-sm hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                  >
                    Create Project →
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
