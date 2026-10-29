# 全国 GitHub：継続更新の最小運用案

確認日: 2026-10-29。未承認の新規 workflow、cron、token、権限、Pages設定変更は実行していない。

## 第一案：既存の dot 毎時点検に統合

ユーザーが依頼済みの毎時点検と全国 GitHub 単独担当を利用する。新しいスケジュールは作成しない。元 Sites と自動同期しない。

1. 毎時実行は最新 main、進行中 Pages、直前の公開記録と未反映マニフェストを読み、公開中なら同じ処理を重複開始しない。
2. 未確認項目を公式根拠で調べ、独立レビューを受けた差分のみをマニフェストへ入れる。URL通信検査・確認日更新は事実確認の代わりにしない。
3. 現行data hash/expected main、全before（プロパティ不存在/nullも区別）、対象外不変、件数・順序、条件、HTMLのdata参照hashを検証する。レビュー保留、取得拒否、期限切れは既存公開値を保持する。
4. 既存 GitHub connector の承認済み単独編集経路で blob/tree/commit を作り、expected SHA付きの非強制CASでmainへ反映する。結果不明ならremote照合を先にし、再書込みを推測で行わない。
5. 当該SHAの正式Pages完了と公開bytes、代表実ブラウザを確認する。通常表示が古ければ観測を記録し、成功を早合点しない。
6. 各段階のrun/commit/hash、適用・保留項目、公式根拠/日付、テスト範囲、公開確認、未完範囲を保存する。研究施設数を全項目検証済件数としない。

## 失敗・承認待ち

- 検証失敗、古いHEAD、tool拒否/未承認、公式内容の不確実性では公開しない。
- 送信結果不明は読取照合。拒否を別経路で迂回しない。
- 公開済み不具合は復元可能な旧版から新しいcommitで戻す案を作成し、担当と権限内でテスト・公開再確認する。復元実演未実施を『復旧運用済み』としない。
- 必要な承認は親会話に具体操作で提示し、待機中も独立調査は可能な範囲で続ける。

## GitHub Actions単独運転との違い

この第一案は dot の既存実行による継続更新であり、GitHub Actionsだけで調査・更新・公開する構成ではない。安全適用スクリプトはローカル候補生成道具であり、無人の事実抽出器ではない。

GitHub公式はGITHUB_TOKENでpushしたcommitではPages buildが起動しないと明記するため、contents:writeを追加するだけの設計は採用しない。
出典: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

GITHUB_TOKEN既定権限は現connectorで読取未確認。/actions/workflows と /actions/permissions/workflow は allowed endpoint外という400応答。接続repoのpush/admin表示はtoken既定権限の証拠ではない。

別案のcustom Pages deploymentや新しいApp/PAT・persistent権限・cronは、必要性と追加権限を利用者に説明して承認を得るまで実装しない。

## 完了を判定するために残る証拠

- 次回の実際の既存毎時runが台帳から続きを選び、単独担当で同じゲートを使って更新/保留を完遂した記録。
- 検証失敗・承認待ち時に公開不変、結果不明時に重複しないことの実運用記録。
- 必要な復元工程と次回公開の検証。全施設の事実照合と合意したSEO範囲の完了。

今回の手動実装・unit test成功だけでこの実運用完了を宣言しない。
