# 根拠付き更新の安全な適用

このリポジトリは静的 GitHub Pages です。`scripts/apply-reviewed.mjs` は独立レビュー済みの明示的な差分からローカル公開候補を作る道具であり、情報収集・内容の自動調査・定期実行・GitHub への書込み・公開を行いません。URL が応答しただけで内容や確認日を更新しません。

## 検証

Node.js の標準ライブラリのみを使います。

```sh
node --test scripts/tests/*test*
node scripts/validate-publication.mjs . --baseline OLD_DATA_JS
node scripts/apply-reviewed.mjs INPUT_DATA MANIFEST NEW_OUTPUT HEAD_FILE YYYY-MM-DD
```

入力と出力は別ファイルとし、既存の出力は上書きしません。失敗・差分なしの場合は出力を作りません。`HEAD_FILE` は公開担当が直前に確認したリモート main の SHA です。ファイルの存在だけではリモートの確認になりません。

マニフェストには `baseSha`、`inputSha256`、`patchSetId`、`allowedIds`、`patches` を記録します。各差分は `id`、`field`、`before`、`after`、`sourceEvidence`、`reviewStatus` を持ちます。レビュー状態は `supported` または `supported_with_required_conditions_applied` に限定します。根拠の内容・出典・条件は人による照合が必要で、文字列が入っているだけでは事実の証明になりません。

未知 ID、対象外項目、重複、古い before、HEAD/hash 不一致、保留、根拠なし、確認日だけの刷新等を拒否します。料金を検証済みとする場合は有効期間と曜日・ホール数/ラウンド・スタイル・人数・食事・税・カート・割増の独立レビューが必要です。未検証の旧項目へ新しい確認日を包括適用しません。

## 公開担当の必須工程

1. 最新 main と単独編集責任者を確認し、既存修正を残した before を照合する。
2. 公式根拠、確認日、変更範囲、旧コミットを `docs/corrections/` に残す。観光協会・予約サイトは運営公式と区別する。
3. 候補生成後に全件数・ID順序・対象外不変・条件付き本文と実レンダーを検証する。
4. **data.js が変わるたびに、index.html と find.html の両参照を同一の `data.js?v=<新しいdata.jsのGit blob SHA>` に更新し、実ファイルの hash と一致することを検証する。** 片方だけの変更は禁止する。
5. 最新 main を再確認し、expected SHA 付きの非強制更新で公開する。別担当の更新があれば停止して差分を再照合する。結果不明な書込みは照合してから判断し、重複実行しない。
6. 対象 SHA の正式 Pages 成功、公開 HTML/データの一致、通常読み込みの実ブラウザで対象表示・検索/都県/リセット・質問フローへの影響を確認する。未確認を完了と報告しない。
7. 復元が必要なら旧コミットの対象ファイルを新しいコミットで戻す。履歴を書き換えない。復元後もテスト・公開確認を行う。

この道具だけでは定期自動更新の完成ではありません。予定実行、失敗時の運用、正式公開と復元の実観測、Search Console の運用、全施設の事実照合は別途確認が必要です。元 Sites との無条件同期、ホスト全体の robots.txt の変更、アクセス権変更はしません。


## 部分確認と混合出典

一つの項目の中で旧予約情報と新しい公式情報が混在する場合、全内容を新しい確認日で表示しません。`sourceType: "mixed"` と `evidenceSegments` を用い、各セグメントに **対象の本文 `text`、根拠URL `url`、確認日 `checked`、出典種別 `sourceType`、照合根拠 `basis`** を記録します。

- 各セグメントの本文の直下へ、その記述だけの出典・確認日を表示します。予約・運営公式・観光案内・口コミを区別します。
- 項目全体の `text` は各セグメント本文を半角空白で連結した値と一致させます。互換用の `url` と `checked` は先頭セグメントを保持し、画面では全体確認日として表示しません。
- 未確認の旧文の確認日を更新しません。新しく確定した文だけに新確認日を付けます。旧数値を訂正するときはその数値の旧文を残して矛盾させず、関係のない旧条件・出典を残します。
- `mixed` と項目全体の `conditions`、または `priceVerified: true` の併用は未対応として拒否します。分割できない料金・条件は保留です。制約は対象セグメントの本文へ正確に含めます。
- 追加根拠URLはHTTP(S)のみ、認証情報入りURLを拒否します。本文・日付はHTMLとして解釈せずエスケープし、外部リンクのnoopener/noreferrerを維持します。
- access.js・details.js・finder.jsを変更した場合は両HTMLで使用される各スクリプトの参照にも内容hashを付け、一組として公開してください。dataだけ先行して旧rendererで混合出典を表示させないこと。

公開gateは読み取り専用です。dataのJSON構造/1,800件/ID唯一、両HTMLのdata hash、canonical、実在2URL sitemap、任意の旧dataとのID順序・カテゴリ順序を確認します。事実照合・正式Pages・実ブラウザ・検索エンジン登録の代わりではありません。


## 確認日・期限の日付基準
- 新しい確認日、料金有効期間の判定、期限レビューは `Asia/Tokyo`（JST）の日付を用います。UTC15:00以降は日本では翌日です。
- `apply-reviewed.mjs` の最後の `YYYY-MM-DD` はその時点のJST日付を渡してください。UTCの日付との1日差を理由に、正しく記録したJST確認日を未来日として拒否しないよう呼出側で揃えます。
- 既存出典の日付は一括更新しません。URLが応答しただけで確認日を刷新しないこと。旧段落は旧出典日、新たに事実を確認した段落だけ新確認日とします。
- 期限後に未確認の新金額・期間を作らず、掲載済み参考プランの期間と確認日を維持し、予約日の料金を保証しない表示を保ちます。期限キューは既存点検の入力であり、新しいスケジュールを作りません。

## 訂正の再発防止
`node scripts/check-known-corrections.mjs data.js` と `node scripts/check-hole-counts.mjs data.js` を公開gateと併用します。対象の限定回帰であり全施設の事実監査ではありません。意図的に根拠付き訂正を更新する場合は、独立レビューを経て固定条件も更新します。
削除・書換候補は `node scripts/list-review-required.mjs normalized-changes.json` で抽出し、`docs/deletion-review-procedure.md` に従って出典と条件の保持を人手確認してください。
