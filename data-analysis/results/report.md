# Mellow: analise do dataset PHQ-9 (Moodpath, 14 dias)

- Linhas (respostas): 5135
- Participantes: 185
- Com PHQ-9 >= 10: 139 (75%)

## Severidade PHQ-9
| Nivel | Participantes |
|---|---|
| Minima | 12 |
| Ligeira | 34 |
| Moderada | 41 |
| Mod. grave | 44 |
| Grave | 54 |

## Sinais mais ligados ao PHQ-9 (Spearman)
| Sinal | rho |
|---|---|
| symptom_burden | 0.72 |
| mood_mean | -0.64 |
| Autoestima (q7) | 0.63 |
| Culpa/desvalorizacao (q9) | 0.61 |
| Culpa/desvalorizacao (q10) | 0.56 |
| Humor deprimido (q1) | 0.55 |
| Perda de interesse/prazer (q3) | 0.54 |
| Visao do futuro (q46) | 0.54 |
| Fadiga (q6) | 0.52 |
| Ideacao suicida/autolesao (q16) | 0.51 |
| Perda de interesse/prazer (q4) | 0.50 |
| Humor deprimido (q2) | 0.49 |

## Quantos dias precisamos?
| Dias | AUC |
|---|---|
| 1 | 0.66 |
| 2 | 0.72 |
| 3 | 0.73 |
| 4 | 0.74 |
| 5 | 0.77 |
| 6 | 0.78 |
| 7 | 0.77 |
| 8 | 0.77 |
| 9 | 0.80 |
| 10 | 0.81 |
| 11 | 0.79 |
| 12 | 0.79 |
| 13 | 0.78 |
| 14 | 0.80 |

## Simulacao do relapse watch (trajetorias longas)
Pessoas com 6+ semanas de dados: 62
Pessoas em que o relapse watch disparou: 27 (44%)
Dia mediano do primeiro alerta: 33.0

Graficos: 01_phq9_distribution.png, 02_phq9_items.png, 03_feature_correlations.png, 04_mood_trajectories.png, 05_auc_by_days.png, 06_relapse_watch_examples.png