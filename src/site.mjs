// サイトの章とページの並び。
// ページを足すときは、ここに1行足して src/pages/<id>.html を作る。
// id がそのまま URL になる(top は「/」、それ以外は「/<id>/」)。
// prep:1 を付けると、トップの一覧に「準備中」と出る。

export const CH = [
  {id:'top', name:'トップ'},
  {id:'year', name:'各年戦略'},
  {id:'basic', name:'基本戦略'},
  {id:'delve', name:'探索攻略'},
  {id:'event', name:'リーグと催し'},
  {id:'quest', name:'依頼攻略'},
  {id:'home', name:'故郷'},
  {id:'gloss', name:'用語集'}
];

export const PAGES = [
  {id:'top', ch:'top', t:'トップ'},
  {id:'y1', ch:'year', t:'1年目(草創期)', d:'創設のおすすめ設定、最初の先鋒隊、出撃前のルール、建設順'},
  {id:'y2-5', ch:'year', t:'2〜5年目(拡張期)', d:'昇格、名簿の厚み、この時期にやること'},
  {id:'toprank', ch:'year', t:'トップランク周辺', d:'引退と世代交代、事故を防ぐ、長期戦の指針'},
  {id:'founding', ch:'basic', t:'ギルド創設', d:'開始位置、庇護者、ギルドマスター全10種、取り決め、最初の探索者選び'},
  {id:'classes', ch:'basic', t:'職業と種族', d:'9職業と10種族の基本データ、歴戦で覚える技'},
  {id:'recruit', ch:'basic', t:'採用と契約', d:'酒場・探索者市場、先天的な才、ライバルからの引き抜き、誓約(Oath)'},
  {id:'growth', ch:'basic', t:'育成', d:'訓練、熟練、誓い(Vow)、学舎の設定'},
  {id:'traits', ch:'basic', t:'特性', d:'111種の特性と、依頼・探索・イベントとの相性表'},
  {id:'state', ch:'basic', t:'状態', d:'状態・重圧・疲労の増減と線、回復手段、負傷・後遺症・病気'},
  {id:'management', ch:'basic', t:'経営', d:'お金の流れ、借金、職員'},
  {id:'expansion', ch:'basic', t:'ギルドの拡張', d:'ギルドハウスと名声、施設、専門化'},
  {id:'gear', ch:'basic', t:'装備', d:'武具庫の画面、品格と等級、武具方の棚と特注'},
  {id:'records', ch:'basic', t:'記録と物語', d:'栄誉、年代記、討たれた伝説', prep:1},
  {id:'odds', ch:'delve', t:'勝率', d:'勝率予想の読み方。探索攻略の物差し'},
  {id:'formation', ch:'delve', t:'隊形', d:'配置の原則と、攻略記事の隊形'},
  {id:'orders', ch:'delve', t:'戦術(ガンビット)', d:'戦闘中の行動ルール。中級者向け'},
  {id:'dungeon', ch:'delve', t:'ダンジョンと状態', d:'部屋、悪条件、危険度、報酬'},
  {id:'league', ch:'event', t:'リーグ戦・試練・昇格', d:'リーグの仕組み、昇格、Crucible'},
  {id:'war', ch:'event', t:'戦乱', d:'出陣の画面、配置、結果、戦乱に効く要素'},
  {id:'cup', ch:'event', t:'大会', d:'公開大会(地方ごとの勝ち抜き戦)', prep:1},
  {id:'gatherings', ch:'event', t:'腕だめし', d:'集い(最後の灯・大狩り・土俵)と試しの日', prep:1},
  {id:'deep', ch:'event', t:'深淵', d:'1〜2年目から開く巨大ダンジョン', prep:1},
  {id:'quests', ch:'quest', t:'依頼種別と関連する資質', d:'依頼の種類、成否と報酬の計算、適性の補正'},
  {id:'town', ch:'quest', t:'町の依頼', d:'故郷の普請で出る、町の仕事と資材の依頼'},
  {id:'stillroom', ch:'quest', t:'薬膳房の依頼', d:'自分で出して自分で受け、在庫を増やす依頼', prep:1},
  {id:'home', ch:'home', t:'故郷', d:'町の画面、しきたり、脅威と防衛、町の施設'},
  {id:'glossary', ch:'gloss', t:'用語集', d:'{G}項目。検索と分類で絞り込み'},
  {id:'about', ch:'gloss', t:'出典と注意', d:'情報源と、日本語表記の確認状況'}
];

// 旧サイト(1ページ版)のハッシュ名の読み替え
export const OLD = {'year1':'y1','year2-3':'y2-5','late':'toprank','patron':'founding'};
