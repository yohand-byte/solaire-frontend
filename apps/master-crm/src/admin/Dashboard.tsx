import { useCollection } from "../hooks/useCollection";
import { PACKS } from "../constants";
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";

const colors = ["#2563eb", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444"];

export default function AdminDashboard() {
  const { data: leads } = useCollection("leads");
  const { data: files } = useCollection("files");
  const now = Date.now();
  const last30 = now - 30 * 24 * 3600 * 1000;
  const leads30 = (leads || []).filter((l: any) => (l.createdAt?.toMillis?.() || 0) > last30);
  const filesData = files || [];
  const enRetard = filesData.filter((f: any) => f.statutGlobal !== "finalise" && (f.updatedAt?.toMillis?.() || 0) < now - 7 * 24 * 3600 * 1000);
  const actionsToday = filesData.filter((f: any) => {
    const d = f.nextActionDate?.toDate?.() || (f.nextActionDate ? new Date(f.nextActionDate) : null);
    return d && d.toDateString() === new Date().toDateString();
  });

  const byPack = PACKS.map(p => ({ name: p.label, value: filesData.filter((f: any) => f.pack === p.value).length }));
  const byStatus = ["en_attente", "en_cours", "finalise", "clos", "bloque"].map((s, i) => ({
    name: s, value: filesData.filter((f: any) => f.statutGlobal === s).length, fill: colors[i % colors.length]
  }));

  return (
    <div className="grid">
      <div className="cards" style={{ gridColumn: "1 / -1" }}>
        <div className="metric"><h4>Leads 30j</h4><div className="big">{leads30.length}</div></div>
        <div className="metric"><h4>Dossiers en cours</h4><div className="big">{filesData.filter((f: any) => f.statutGlobal === "en_cours").length}</div></div>
        <div className="metric"><h4>Dossiers en retard</h4><div className="big">{enRetard.length}</div></div>
        <div className="metric"><h4>Finalisés 30j</h4><div className="big">{filesData.filter((f: any) => ["finalise", "clos"].includes(f.statutGlobal) && (f.updatedAt?.toMillis?.() || 0) > last30).length}</div></div>
      </div>

      <div className="card">
        <h3>Dossiers en retard</h3>
        <table className="table">
          <thead><tr><th>Réf</th><th>Installateur</th><th>Statut</th><th>Dernière MAJ</th></tr></thead>
          <tbody>
            {enRetard.map((f: any) => (
              <tr key={f.id}>
                <td>{f.reference}</td>
                <td>{f.installerId}</td>
                <td><span className={`badge-status ${f.statutGlobal}`}>{f.statutGlobal}</span></td>
                <td>{f.updatedAt?.toDate?.().toLocaleDateString?.() || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Actions du jour</h3>
        <table className="table">
          <thead><tr><th>Réf</th><th>Prochaine action</th><th>Date</th></tr></thead>
          <tbody>
            {actionsToday.map((f: any) => (
              <tr key={f.id}><td>{f.reference}</td><td>{f.nextAction || "—"}</td><td>{new Date(f.nextActionDate.toDate ? f.nextActionDate.toDate() : f.nextActionDate).toLocaleDateString()}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Répartition par pack</h3>
        <BarChart width={360} height={260} data={byPack}>
          <XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
          <Bar dataKey="value" fill="#2563eb" />
        </BarChart>
      </div>

      <div className="card">
        <h3>Répartition par statut</h3>
        <PieChart width={360} height={260}>
          <Pie data={byStatus} dataKey="value" nameKey="name" label>
            {byStatus.map((d, i) => <Cell key={d.name} fill={d.fill} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </div>
    </div>
  );
}
