"""
Mellow - analise exploratoria do dataset Kaggle "PHQ-9 Depression Assessment"
(thedevastator/phq-9-depression-assessment)

Origem dos dados: Burchert, Kerber, Zimmermann & Knaevelsrud (2021), PLOS ONE,
"Screening accuracy of a 14-day smartphone ambulatory assessment of depression
symptoms and mood dynamics in a general population sample" (app Moodpath).
Dataset original: Zenodo 10.5281/zenodo.3384860

Como correr:
    pip install kagglehub pandas numpy matplotlib scikit-learn
    python phq9_analysis.py                 # descarrega com kagglehub
    python phq9_analysis.py caminho/para.csv  # ou usa um CSV ja descarregado

Resultados ficam na pasta ./results (graficos PNG + report.md + features.csv)
"""

import os
import sys
import glob

import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------------------
# 1. Carregar dados
# ---------------------------------------------------------------------------

def load_csv():
    if len(sys.argv) > 1:
        return pd.read_csv(sys.argv[1])
    import kagglehub

    path = kagglehub.dataset_download("thedevastator/phq-9-depression-assessment")
    print("Path to dataset files:", path)
    files = glob.glob(os.path.join(path, "**", "*.csv"), recursive=True)
    if not files:
        raise SystemExit("Nenhum CSV encontrado em " + path)
    print("A usar:", files[0])
    return pd.read_csv(files[0])


df = load_csv()
df.columns = [c.strip() for c in df.columns]
df = df.loc[:, ~df.columns.str.match(r"^Unnamed")]
cols = list(df.columns)
print("\nLinhas:", len(df), "| Colunas:", len(cols))
print(cols)

# ---------------------------------------------------------------------------
# 2. Dicionario de colunas (codebook do estudo original)
# ---------------------------------------------------------------------------

CODEBOOK = {
    "q1": ("Sente-se deprimido?", "Humor deprimido"),
    "q2": ("Sente-se sem esperanca?", "Humor deprimido"),
    "q3": ("Sem interesse em nada neste momento?", "Perda de interesse/prazer"),
    "q4": ("Menos prazer no que costuma gostar?", "Perda de interesse/prazer"),
    "q5": ("Bastante menos energia?", "Fadiga"),
    "q6": ("Tarefas do dia a dia muito cansativas?", "Fadiga"),
    "q7": ("Autoconfianca mais baixa que o normal?", "Autoestima"),
    "q8": ("Sente-se capaz das suas tarefas?", "Autoestima"),
    "q9": ("A culpar-se neste momento?", "Culpa/desvalorizacao"),
    "q10": ("Acha que vale menos que os outros?", "Culpa/desvalorizacao"),
    "q11": ("Dificil tomar decisoes?", "Concentracao"),
    "q12": ("Dificil concentrar-se?", "Concentracao"),
    "q13": ("Dormiu mal esta noite?", "Sono"),
    "q14": ("Pouco ou nenhum apetite hoje?", "Apetite"),
    "q16": ("Pensa na morte mais do que o normal?", "Ideacao suicida/autolesao"),
    "q46": ("Acha que vai estar bem no futuro?", "Visao do futuro"),
    "q47": ("Olha o futuro com esperanca?", "Visao do futuro"),
}
# No CSV do Kaggle todas as perguntas q* estao codificadas 0-4 com valor alto = mais sintoma
# (verificado: q8, q46 e q47 correlacionam POSITIVAMENTE com o PHQ-9), por isso nada e invertido.
REVERSED = set()

PHQ_TEXT = [
    "Pouco interesse ou prazer em fazer coisas",
    "Sentir-se em baixo, deprimido ou sem esperanca",
    "Problemas em adormecer/dormir, ou dormir demais",
    "Cansaco ou pouca energia",
    "Pouco apetite ou comer demais",
    "Sentir-se mal consigo proprio / um fracasso",
    "Dificuldade de concentracao",
    "Lentidao ou agitacao notada por outros",
    "Pensamentos de morte ou de se magoar",
]

def find(*names):
    low = {c.lower(): c for c in cols}
    for n in names:
        if n.lower() in low:
            return low[n.lower()]
    return None

phq_cols = [find("phq%d" % i, "phq_%d" % i, "phq.%d" % i) for i in range(1, 10)]
phq_cols = [c for c in phq_cols if c]
q_cols = [c for c in cols if c.lower() in CODEBOOK]
mood_col = find("happiness.score", "happiness_score", "happiness", "mood")
time_col = find("time", "timestamp", "datetime")
period_col = find("period.name", "period_name", "period")
start_col = find("start.time", "start_time")
age_col = find("age")
sex_col = find("sex", "gender")
id_col = find("user_id", "userid", "user", "id", "participant", "participant_id")

# Se nao houver ID, cada participante tem o mesmo PHQ-9/idade/sexo repetido
# em todas as linhas -> usamos essa combinacao como identificador.
if id_col is None:
    key = phq_cols + [c for c in (age_col, sex_col, start_col) if c]
    df["participant"] = df.groupby(key, dropna=False).ngroup()
    id_col = "participant"
    print("\nSem coluna de ID: participantes inferidos a partir de", key)

df["phq_total"] = df[phq_cols].sum(axis=1)
bins = [-1, 4, 9, 14, 19, 27]
labels = ["Minima", "Ligeira", "Moderada", "Mod. grave", "Grave"]
df["phq_severity"] = pd.cut(df["phq_total"], bins=bins, labels=labels)

for c in q_cols:
    if c.lower() in REVERSED:
        mx = df[c].max()
        df[c + "_r"] = mx - df[c]
sym_cols = [c + "_r" if c.lower() in REVERSED else c for c in q_cols]

# Dataset Kaggle: phq.day = dias relativamente ao momento em que o PHQ-9 foi preenchido
# (negativo = antes, positivo = depois). O estudo usa os 14 dias ANTES do PHQ-9.
phqday_col = find("phq.day", "phq_day")
if time_col:
    df["_t"] = pd.to_datetime(df[time_col], errors="coerce")
    df = df.sort_values([id_col, "_t"])
df_all = df.copy()  # todas as respostas (algumas pessoas usaram a app durante meses)
if phqday_col:
    df = df[df[phqday_col].between(-14, 0)].copy()
    df["_day"] = np.floor(df[phqday_col] + 14).clip(0, 13).astype(int)
elif time_col:
    df["_day"] = df.groupby(id_col)["_t"].transform(lambda s: (s.dt.normalize() - s.dt.normalize().min()).dt.days)
else:
    df["_day"] = df.groupby(id_col).cumcount() // 3
print("Respostas nos 14 dias antes do PHQ-9:", len(df), "de", len(df_all))

# ---------------------------------------------------------------------------
# 3. Features por participante (inspiradas no artigo + no que o Mellow mede)
# ---------------------------------------------------------------------------

def rmssd(x):
    x = np.asarray(x, dtype=float)
    x = x[~np.isnan(x)]
    return np.sqrt(np.mean(np.diff(x) ** 2)) if len(x) > 2 else np.nan

def autocorr(x):
    x = pd.Series(x, dtype=float).dropna()
    return x.autocorr(1) if len(x) > 3 else np.nan

def participant_features(g, max_day=None):
    if max_day is not None:
        g = g[g["_day"] < max_day]
    out = {}
    if mood_col:
        m = g[mood_col]
        out["mood_mean"] = m.mean()          # nivel medio de humor
        out["mood_sd"] = m.std()             # variabilidade
        out["mood_rmssd"] = rmssd(m)         # instabilidade (saltos de momento a momento)
        out["mood_inertia"] = autocorr(m)    # inercia: humor "preso" (sinal de alerta precoce)
        daily = g.groupby("_day")[mood_col].mean()
        out["mood_trend"] = np.polyfit(daily.index, daily.values, 1)[0] if len(daily) > 2 else np.nan
    if sym_cols:
        out["symptom_burden"] = g[sym_cols].mean(axis=1).mean()
    for c in sym_cols:
        out["sym_" + c] = g[c].mean()
    out["n_answers"] = len(g)
    out["n_days"] = g["_day"].nunique()
    return pd.Series(out)

meta = df.groupby(id_col).agg(
    phq_total=("phq_total", "first"),
    **({"age": (age_col, "first")} if age_col else {}),
    **({"sex": (sex_col, "first")} if sex_col else {}),
)
feat = df.groupby(id_col).apply(participant_features)
P = meta.join(feat)
P["depressed"] = (P["phq_total"] >= 10).astype(int)  # cut-off clinico habitual
P.to_csv(os.path.join(OUT, "features.csv"))

# ---------------------------------------------------------------------------
# 4. Graficos
# ---------------------------------------------------------------------------

plt.figure(figsize=(7, 4))
P["phq_total"].plot.hist(bins=range(0, 29), edgecolor="white")
plt.axvline(10, color="tab:red", ls="--", label="cut-off 10")
plt.xlabel("PHQ-9 total"); plt.ylabel("Participantes"); plt.title("Distribuicao do PHQ-9")
plt.legend(); plt.tight_layout(); plt.savefig(os.path.join(OUT, "01_phq9_distribution.png"), dpi=130); plt.close()

item_means = df.groupby(id_col)[phq_cols].first().mean()
plt.figure(figsize=(8, 4.5))
plt.barh([t[:45] for t in PHQ_TEXT[: len(phq_cols)]][::-1], item_means.values[::-1])
plt.xlabel("Media (0 = nunca, 3 = quase todos os dias)"); plt.title("Itens do PHQ-9")
plt.tight_layout(); plt.savefig(os.path.join(OUT, "02_phq9_items.png"), dpi=130); plt.close()

num = P.select_dtypes("number").drop(columns=["phq_total", "depressed", "n_answers", "n_days"], errors="ignore")
corr = num.corrwith(P["phq_total"], method="spearman").dropna().sort_values()
def nice(n):
    if n.startswith("sym_"):
        q = n[4:].replace("_r", "")
        return "%s (%s)" % (CODEBOOK.get(q, (q, q))[1], q)
    return n
plt.figure(figsize=(8, max(4, 0.3 * len(corr))))
plt.barh([nice(i) for i in corr.index], corr.values, color=["tab:blue" if v < 0 else "tab:orange" for v in corr.values])
plt.xlabel("Correlacao de Spearman com o PHQ-9"); plt.title("Que sinais diarios acompanham a depressao?")
plt.tight_layout(); plt.savefig(os.path.join(OUT, "03_feature_correlations.png"), dpi=130); plt.close()

if mood_col:
    lo = P[P["phq_total"] <= 4].index[:3]
    hi = P[P["phq_total"] >= 15].index[:3]
    plt.figure(figsize=(9, 4))
    for pid in lo:
        d = df[df[id_col] == pid].groupby("_day")[mood_col].mean()
        plt.plot(d.index, d.values, color="tab:blue", alpha=0.7)
    for pid in hi:
        d = df[df[id_col] == pid].groupby("_day")[mood_col].mean()
        plt.plot(d.index, d.values, color="tab:orange", alpha=0.7)
    plt.plot([], [], color="tab:blue", label="PHQ-9 <= 4"); plt.plot([], [], color="tab:orange", label="PHQ-9 >= 15")
    plt.xlabel("Dia"); plt.ylabel("Humor medio do dia"); plt.title("Trajetorias de humor em 14 dias")
    plt.legend(); plt.tight_layout(); plt.savefig(os.path.join(OUT, "04_mood_trajectories.png"), dpi=130); plt.close()

# ---------------------------------------------------------------------------
# 5. Modelo simples: quantos dias de dados precisamos para detetar?
# ---------------------------------------------------------------------------

model_lines = []
try:
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import cross_val_score, StratifiedKFold
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.impute import SimpleImputer

    days, aucs = [], []
    for k in range(1, 15):
        Fk = df.groupby(id_col).apply(lambda g: participant_features(g, max_day=k))
        Xk = Fk.drop(columns=["n_answers", "n_days"], errors="ignore")
        yk = P.loc[Xk.index, "depressed"]
        if yk.nunique() < 2:
            continue
        pipe = make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), LogisticRegression(max_iter=2000))
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)
        s = cross_val_score(pipe, Xk, yk, cv=cv, scoring="roc_auc")
        days.append(k); aucs.append(s.mean())
    if days:
        plt.figure(figsize=(7, 4))
        plt.plot(days, aucs, marker="o")
        plt.ylim(0.5, 1); plt.xlabel("Dias de dados usados"); plt.ylabel("AUC (validacao cruzada)")
        plt.title("Detetar PHQ-9 >= 10 a partir do check-in diario")
        plt.grid(alpha=0.3); plt.tight_layout(); plt.savefig(os.path.join(OUT, "05_auc_by_days.png"), dpi=130); plt.close()
        model_lines.append("| Dias | AUC |\n|---|---|")
        model_lines += ["| %d | %.2f |" % (d, a) for d, a in zip(days, aucs)]
except ImportError:
    model_lines.append("scikit-learn nao instalado: `pip install scikit-learn` para correr o modelo.")

# ---------------------------------------------------------------------------
# 5b. Simulacao do "relapse watch" do Mellow em trajetorias longas reais
#     baseline = primeiros 14 dias da pessoa; alerta quando a media movel de 7 dias
#     do humor fica abaixo de (baseline - 1 desvio-padrao) durante 3 dias seguidos.
# ---------------------------------------------------------------------------

sim_lines = []
if mood_col and time_col:
    a = df_all.dropna(subset=["_t"]).copy()
    a["_date"] = a["_t"].dt.normalize()
    daily = a.groupby([id_col, "_date"])[mood_col].mean().reset_index()
    results = []
    for pid, g in daily.groupby(id_col):
        g = g.set_index("_date")[mood_col].asfreq("D")
        span = (g.index.max() - g.index.min()).days + 1
        if span < 42 or g.notna().sum() < 25:
            continue
        base = g.iloc[:14].dropna()
        if len(base) < 7:
            continue
        mu, sd = base.mean(), max(base.std(), 0.3)
        roll = g.rolling(7, min_periods=4).mean()
        below = (roll < mu - sd).astype(int)
        alert = below.rolling(3).sum() >= 3
        alert.iloc[:14] = False
        first = alert[alert].index.min() if alert.any() else None
        results.append(dict(user=pid, days=span, baseline=mu, alert=bool(alert.any()),
                            first_alert_day=(first - g.index.min()).days if first is not None else None,
                            phq=P.loc[pid, "phq_total"] if pid in P.index else np.nan,
                            series=g, roll=roll, thr=mu - sd, alerts=alert))
    if results:
        R = pd.DataFrame([{k: v for k, v in r.items() if k not in ("series", "roll", "alerts")} for r in results])
        R.drop(columns=[], errors="ignore").to_csv(os.path.join(OUT, "relapse_watch_simulation.csv"), index=False)
        n_alert = int(R["alert"].sum())
        sim_lines += [
            "Pessoas com 6+ semanas de dados: %d" % len(R),
            "Pessoas em que o relapse watch disparou: %d (%.0f%%)" % (n_alert, 100 * n_alert / len(R)),
            "Dia mediano do primeiro alerta: %s" % (R["first_alert_day"].median() if n_alert else "-"),
        ]
        ex = sorted([r for r in results if r["alert"]], key=lambda r: -r["days"])[:3]
        if ex:
            fig, axes = plt.subplots(len(ex), 1, figsize=(10, 3 * len(ex)), squeeze=False)
            for ax, r in zip(axes[:, 0], ex):
                ax.plot(r["series"].index, r["series"].values, ".", color="grey", alpha=0.5, label="humor diario")
                ax.plot(r["roll"].index, r["roll"].values, color="tab:blue", label="media 7 dias")
                ax.axhline(r["baseline"], color="tab:green", ls=":", label="baseline (14 dias)")
                ax.axhline(r["thr"], color="tab:red", ls="--", label="limiar de alerta")
                for d in r["alerts"][r["alerts"]].index:
                    ax.axvspan(d, d + pd.Timedelta(days=1), color="tab:orange", alpha=0.25, lw=0)
                ax.set_title("Participante %s (%d dias)" % (r["user"], r["days"]))
                ax.set_ylabel("Humor (0-4)")
            axes[0, 0].legend(loc="upper right", fontsize=8)
            plt.tight_layout(); plt.savefig(os.path.join(OUT, "06_relapse_watch_examples.png"), dpi=130); plt.close()

# ---------------------------------------------------------------------------
# 6. Relatorio
# ---------------------------------------------------------------------------

sev = P["phq_total"].pipe(pd.cut, bins=bins, labels=labels).value_counts().reindex(labels)
lines = [
    "# Mellow: analise do dataset PHQ-9 (Moodpath, 14 dias)",
    "",
    "- Linhas (respostas): %d" % len(df),
    "- Participantes: %d" % len(P),
    "- Com PHQ-9 >= 10: %d (%.0f%%)" % (P["depressed"].sum(), 100 * P["depressed"].mean()),
    "",
    "## Severidade PHQ-9",
    "| Nivel | Participantes |", "|---|---|",
] + ["| %s | %d |" % (k, v) for k, v in sev.items()] + [
    "",
    "## Sinais mais ligados ao PHQ-9 (Spearman)",
    "| Sinal | rho |", "|---|---|",
] + ["| %s | %.2f |" % (nice(i), v) for i, v in corr.sort_values(key=abs, ascending=False).head(12).items()] + [
    "",
    "## Quantos dias precisamos?",
] + model_lines + [
    "",
    "## Simulacao do relapse watch (trajetorias longas)",
] + sim_lines + [
    "",
    "Graficos: 01_phq9_distribution.png, 02_phq9_items.png, 03_feature_correlations.png, 04_mood_trajectories.png, 05_auc_by_days.png, 06_relapse_watch_examples.png",
]
open(os.path.join(OUT, "report.md"), "w", encoding="utf-8").write("\n".join(lines))
print("\n".join(lines))
print("\nResultados em:", OUT)
