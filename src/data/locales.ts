export type LanguageId =
  | 'en'
  | 'fr'
  | 'de'
  | 'es'
  | 'pt'
  | 'zh'
  | 'ar'
  | 'uk'
  | 'ru'
  | 'ja'
  | 'pl'
  | 'it'
  | 'vi'
  | 'fa'
  | 'elvish'
  | 'orcish';

export interface LanguageMeta {
  id: LanguageId;
  nativeName: string;
  dir: 'ltr' | 'rtl';
}

export const LANGUAGES: LanguageMeta[] = [
  {id: 'en', nativeName: 'English', dir: 'ltr'},
  {id: 'fr', nativeName: 'Français', dir: 'ltr'},
  {id: 'de', nativeName: 'Deutsch', dir: 'ltr'},
  {id: 'es', nativeName: 'Español', dir: 'ltr'},
  {id: 'pt', nativeName: 'Português', dir: 'ltr'},
  {id: 'zh', nativeName: '中文', dir: 'ltr'},
  {id: 'ar', nativeName: 'العربية', dir: 'rtl'},
  {id: 'uk', nativeName: 'Українська', dir: 'ltr'},
  {id: 'ru', nativeName: 'Русский', dir: 'ltr'},
  {id: 'ja', nativeName: '日本語', dir: 'ltr'},
  {id: 'pl', nativeName: 'Polski', dir: 'ltr'},
  {id: 'it', nativeName: 'Italiano', dir: 'ltr'},
  {id: 'vi', nativeName: 'Tiếng Việt', dir: 'ltr'},
  {id: 'fa', nativeName: 'فارسی', dir: 'rtl'},
  {id: 'elvish', nativeName: 'Sindarin (Elvish)', dir: 'ltr'},
  {id: 'orcish', nativeName: 'Orkish', dir: 'ltr'},
];

export interface LocaleStrings {
  gameTitle: string;
  gameSubtitle: string;
  playBtn: string;
  settingsBtn: string;
  fullscreenEnter: string;
  fullscreenExit: string;
  clickHeroHint: string;
  menuHint: string;
  difficultyLabel: string;
  diffWanderer: string;
  diffVityaz: string;
  diffNightmare: string;
  diffOneLife: string;
  diffOneLifeWarn: string;
  graphicsLabel: string;
  gfxLow: string;
  gfxMedium: string;
  gfxHigh: string;
  gfxUltra: string;
  languageLabel: string;
  audioLabel: string;
  masterVol: string;
  musicVol: string;
  sfxVol: string;
  controlsTab: string;
  generalTab: string;
  graphicsTab: string;
  resetBindings: string;
  pressAnyKey: string;
  closeBtn: string;
  pauseTitle: string;
  resumeBtn: string;
  restartBtn: string;
  quitToMenuBtn: string;
  victoryTitle: string;
  defeatTitle: string;
  playAgainBtn: string;
  hpLabel: string;
  spiritLabel: string;
  torchLabel: string;
  realmYav: string;
  realmNav: string;
  resonanceLabel: string;
  ashesLabel: string;
  objectiveExplore: string;
  objectiveShiftAltar: string;
  objectiveSlayLeshy: string;
  objectiveCleared: string;
  promptAltar: string;
  promptTalkMara: string;
  maraLine1: string;
  maraLine2: string;
  runeUpgradeTitle: string;
  vesselLabel: string;
  vesselNone: string;
  vesselWolfFury: string;
  vesselMireVenom: string;
  vesselAshBrand: string;
  skillStrike: string;
  skillDagger: string;
  skillShieldWave: string;
  skillFlameSurge: string;
  skillNavCleave: string;
  skillCrescendo: string;
  skillWhirlwind: string;
  skillSvarogWard: string;
  actionMoveFwd: string;
  actionMoveBack: string;
  actionStrafeL: string;
  actionStrafeR: string;
  actionPrimary: string;
  actionDaggerThrow: string;
  actionTargetCycle: string;
  actionEvade: string;
  actionSkill1: string;
  actionSkill2: string;
  actionSkill3: string;
  actionSkill4: string;
  actionSkill5: string;
  actionSkill6: string;
  actionInteract: string;
  actionPotion: string;
  actionCameraToggle: string;
  actionPause: string;
  targetCycleHint: string;
  enemyUpyr: string;
  enemyKikimora: string;
  enemyVolkolak: string;
  enemyLeshy: string;
  statTime: string;
  statKills: string;
  statShifts: string;
  statMaxResonance: string;
  camOrbit: string;
  camIso: string;
  muteBtn: string;
  actionMapToggle: string;
  mapTitle: string;
  mapBtn: string;
  mapLegendHero: string;
  mapLegendEnemy: string;
  mapLegendAltar: string;
  mapLegendQuest: string;
  mapLegendGateSealed: string;
  mapLegendGateOpen: string;
  promptMirror: string;
  promptSpiritDeal: string;
  questEchoWhisper: string;
  questEchoShardFound: string;
  questEchoDone: string;
  questTotemBurned: string;
  questTotemAllBurned: string;
  volkolakShieldedWhisper: string;
  questSpiritTitle: string;
  questSpiritBody: string;
  questSpiritOfferBtn: string;
  questSpiritRefuseBtn: string;
  questSpiritOffered: string;
  questSpiritRefused: string;
  counterReady: string;
  wardActive: string;
  promptLoreStone: string;
  loreOstrog: string;
  loreMire: string;
  loreBarrow: string;
  loreWatchpost: string;
  questLoreFound: string;
  mapLegendLore: string;
}

const EN: LocaleStrings = {
  gameTitle: 'Nav & Ash',
  gameSubtitle: 'Dark Slavic Action RPG',
  playBtn: 'Enter the Mire',
  settingsBtn: 'Settings',
  fullscreenEnter: 'Fullscreen',
  fullscreenExit: 'Exit Fullscreen',
  clickHeroHint: 'Click the Vityaz to test steel',
  menuHint: 'WASD Move · LMB Strike / Orbit · RMB Evade / Steer · E Nav Altar · Esc Pause',
  difficultyLabel: 'Difficulty',
  diffWanderer: 'Wanderer',
  diffVityaz: 'Vityaz',
  diffNightmare: 'Nightmare',
  diffOneLife: 'One Life',
  diffOneLifeWarn: 'Death ends the run forever',
  graphicsLabel: 'Graphics Quality',
  gfxLow: 'Low',
  gfxMedium: 'Medium',
  gfxHigh: 'High',
  gfxUltra: 'Ultra',
  languageLabel: 'Language',
  audioLabel: 'Audio',
  masterVol: 'Master',
  musicVol: 'Music',
  sfxVol: 'Effects',
  controlsTab: 'Controls',
  generalTab: 'General',
  graphicsTab: 'Graphics',
  resetBindings: 'Reset Defaults',
  pressAnyKey: 'Press key or mouse button...',
  closeBtn: 'Close',
  pauseTitle: 'Campfire Rest',
  resumeBtn: 'Resume',
  restartBtn: 'Restart Run',
  quitToMenuBtn: 'Main Menu',
  victoryTitle: 'Leshy Vanquished',
  defeatTitle: 'Torch Extinguished',
  playAgainBtn: 'Play Again',
  hpLabel: 'Vitality',
  spiritLabel: 'Fury',
  torchLabel: 'Torch',
  realmYav: 'Yav',
  realmNav: 'Dark Nav',
  resonanceLabel: 'Resonance',
  ashesLabel: 'Ashes',
  objectiveExplore: 'Cross the Birch Mire & slay Mire Fiends',
  objectiveShiftAltar: 'Channel a Nav Altar [E] to shatter the cursed gate',
  objectiveSlayLeshy: 'Defeat the Leshy Guardian in the Sanctum',
  objectiveCleared: 'The Ostrog Sanctum is cleansed',
  promptAltar: 'Channel Nav Altar',
  promptTalkMara: 'Speak with Vedunya Mara',
  maraLine1: '“The Leshy sealed the Sanctum gate. Sacrifice Torchlight at a Nav Altar to invert the stones.”',
  maraLine2: '“Dash through burning Nav Sigils to detonate them, and carry my ember blessing.”',
  runeUpgradeTitle: 'Spirit Vessel Absorbed',
  vesselLabel: 'Vessel',
  vesselNone: 'Unbound',
  vesselWolfFury: 'Wolf Fury (+25% Cleave)',
  vesselMireVenom: 'Mire Venom (Sigil Blast)',
  vesselAshBrand: 'Ash Brand (+Torch Regen)',
  skillStrike: 'Sekira',
  skillDagger: 'Dagger',
  skillShieldWave: 'Shield',
  skillFlameSurge: 'Flame',
  skillNavCleave: 'Nav Arc',
  skillCrescendo: 'Execute',
  skillWhirlwind: 'Whirlwind',
  skillSvarogWard: 'Ward',
  actionMoveFwd: 'Move Forward',
  actionMoveBack: 'Backpedal',
  actionStrafeL: 'Strafe Left',
  actionStrafeR: 'Strafe Right',
  actionPrimary: 'Sekira Cleave',
  actionDaggerThrow: 'Throwing Dagger',
  actionTargetCycle: 'Cycle Target Lock',
  actionEvade: 'Jump / Evade',
  actionSkill1: 'Shield Wave',
  actionSkill2: 'Flame Surge',
  actionSkill3: 'Nav Cleave',
  actionSkill4: 'Crescendo Execute',
  actionSkill5: "Perun's Whirlwind",
  actionSkill6: "Svarog's Ward",
  actionInteract: 'Nav Altar / Talk',
  actionPotion: 'Healing Brew',
  actionCameraToggle: 'Camera Mode (Orbit/Iso)',
  actionPause: 'Pause / Menu',
  targetCycleHint: 'Next Target',
  enemyUpyr: 'Mire Upyr',
  enemyKikimora: 'Bog Kikimora',
  enemyVolkolak: 'Dread Volkolak',
  enemyLeshy: 'Leshy Guardian',
  statTime: 'Time',
  statKills: 'Slain',
  statShifts: 'Nav Shifts',
  statMaxResonance: 'Peak Resonance',
  camOrbit: 'Orbit RPG',
  camIso: 'Isometric',
  muteBtn: 'Audio',
  actionMapToggle: 'World Map',
  mapTitle: 'Mire Cartography',
  mapBtn: 'Map',
  mapLegendHero: 'Vityaz',
  mapLegendEnemy: 'Fiends',
  mapLegendAltar: 'Nav Altar',
  mapLegendQuest: 'World Echo / Totem / Spirit',
  mapLegendGateSealed: 'Sealed Sanctum Gate',
  mapLegendGateOpen: 'Sanctum Gate Shattered',
  promptMirror: 'Peer into Cracked Mirror (Nav)',
  promptSpiritDeal: 'Hear the Birch Spirit',
  questEchoWhisper: 'Nav reveals the drowned memory: gather 3 Echo Shards across the Mire.',
  questEchoShardFound: 'An Echo Shard of the past resonates within your torch.',
  questEchoDone: 'The Ancestral Echo heals the land: +20 Max Vitality & +65 Ashes.',
  questTotemBurned: 'A Cursed Shadow Totem crumbles in Flame!',
  questTotemAllBurned: 'All Cursed Totems burned — the Dread Volkolak’s dark shield shatters!',
  volkolakShieldedWhisper: 'Cursed Totems shield the Volkolak! Burn them with Flame Surge [2].',
  questSpiritTitle: 'Whispering Birch Spirit',
  questSpiritBody: '“Cold ashes cover the hollow, warrior. Spare a drop of your Torchlight (35), and I will thin the Leshy’s roots and deepen your Resonance. Or strike me down for raw Fury.”',
  questSpiritOfferBtn: 'Offer 35 Torchlight (Blessing)',
  questSpiritRefuseBtn: 'Shatter Spirit (+50 Fury)',
  questSpiritOffered: 'Spirit’s Blessing: Permanent Resonance & Leshy roots weakened.',
  questSpiritRefused: 'The Birch Spirit weeps into embers — Fury surges within your axe!',
  counterReady: 'Nav Counter Ready! (+45%)',
  wardActive: "Svarog's Ward (-55% DMG)",
  promptLoreStone: 'Read Carved Runestone',
  loreOstrog: 'Stone Chronicle I: "Three winters before the ash fell, the Ostrog elders forged iron wards against the breathing forest."',
  loreMire: 'Stone Chronicle II: "Where Nav meets Yav, the drowned birch remembers every oath whispered into the mire."',
  loreBarrow: 'Stone Chronicle III: "No blade pierces the Volkolak while black totems drink the moonlight over the Barrow."',
  loreWatchpost: 'Stone Chronicle IV: "The watchmen left their torches lit and walked north — into the hollow roots of the Leshy."',
  questLoreFound: 'Ancient chronicle etched into memory: +15 Ashes & +15 Fury.',
  mapLegendLore: 'Carved Lore Stone',
};

const RU: LocaleStrings = {
  gameTitle: 'Навь и Пепел',
  gameSubtitle: 'Славянская Тёмная ARPG',
  playBtn: 'Войти в Трясину',
  settingsBtn: 'Настройки',
  fullscreenEnter: 'Полный экран',
  fullscreenExit: 'Выйти из экрана',
  clickHeroHint: 'Нажмите на Витязя, чтобы испытать сталь',
  menuHint: 'WASD Ходьба · ЛКМ Удар / Обзор · ПКМ Прыжок / Руль · E Алтарь Нави · Esc Пауза',
  difficultyLabel: 'Сложность',
  diffWanderer: 'Странник',
  diffVityaz: 'Витязь',
  diffNightmare: 'Кошмар',
  diffOneLife: 'Одна Жизнь',
  diffOneLifeWarn: 'Смерть обрывает поход навсегда',
  graphicsLabel: 'Качество графики',
  gfxLow: 'Низкое',
  gfxMedium: 'Среднее',
  gfxHigh: 'Высокое',
  gfxUltra: 'Ультра',
  languageLabel: 'Язык',
  audioLabel: 'Звук',
  masterVol: 'Общая',
  musicVol: 'Музыка',
  sfxVol: 'Эффекты',
  controlsTab: 'Управление',
  generalTab: 'Общие',
  graphicsTab: 'Графика',
  resetBindings: 'Сбросить привязки',
  pressAnyKey: 'Нажмите клавишу или кнопку мыши...',
  closeBtn: 'Закрыть',
  pauseTitle: 'Привал у костра',
  resumeBtn: 'Продолжить',
  restartBtn: 'Начать заново',
  quitToMenuBtn: 'Выйти в меню',
  victoryTitle: 'Леший Повержен',
  defeatTitle: 'Факел Погас',
  playAgainBtn: 'Сыграть снова',
  hpLabel: 'Кровь',
  spiritLabel: 'Ярость',
  torchLabel: 'Свет',
  realmYav: 'Явь',
  realmNav: 'Тёмная Навь',
  resonanceLabel: 'Резонанс',
  ashesLabel: 'Пепел',
  objectiveExplore: 'Пройдите Берёзовую топь и сокрушите нечисть',
  objectiveShiftAltar: 'Коснитесь Алтаря Нави [E], чтобы открыть проклятые врата',
  objectiveSlayLeshy: 'Победите Хранителя Лешего в Капище',
  objectiveCleared: 'Острог и капище очищены от скверны',
  promptAltar: 'Активировать Алтарь Нави',
  promptTalkMara: 'Поговорить с Ведуньей Марой',
  maraLine1: '«Леший запечатал врата капища. Принеси свет факела Алтарю Нави, чтобы вывернуть камни.»',
  maraLine2: '«Рывок через руны Нави взрывает их огнём. Возьми моё благословение углей.»',
  runeUpgradeTitle: 'Сосуд Духа поглощён',
  vesselLabel: 'Сосуд',
  vesselNone: 'Пуст',
  vesselWolfFury: 'Ярость Волка (+25% урон)',
  vesselMireVenom: 'Болотный Яд (Взрыв рун)',
  vesselAshBrand: 'Печать Пепла (+Реген света)',
  skillStrike: 'Секира',
  skillDagger: 'Кинжал',
  skillShieldWave: 'Щит',
  skillFlameSurge: 'Пламя',
  skillNavCleave: 'Навь',
  skillCrescendo: 'Казнь',
  skillWhirlwind: 'Вихрь',
  skillSvarogWard: 'Оберег',
  actionMoveFwd: 'Вперёд',
  actionMoveBack: 'Отступление',
  actionStrafeL: 'Шаг влево',
  actionStrafeR: 'Шаг вправо',
  actionPrimary: 'Удар секирой',
  actionDaggerThrow: 'Бросок кинжала',
  actionTargetCycle: 'Смена цели (ближняя → дальняя)',
  actionEvade: 'Прыжок / Рывок',
  actionSkill1: 'Удар щитом',
  actionSkill2: 'Вспышка пламени',
  actionSkill3: 'Рассечение Нави',
  actionSkill4: 'Казнь Резонанса',
  actionSkill5: 'Вихрь Перуна',
  actionSkill6: 'Оберег Сварога',
  actionInteract: 'Алтарь Нави / Диалог',
  actionPotion: 'Целебный отвар',
  actionCameraToggle: 'Режим камеры (Орбита/Изо)',
  actionPause: 'Пауза / Меню',
  targetCycleHint: 'След. цель',
  enemyUpyr: 'Болотный Упырь',
  enemyKikimora: 'Кикимора Топи',
  enemyVolkolak: 'Лютый Волколак',
  enemyLeshy: 'Хранитель Леший',
  statTime: 'Время',
  statKills: 'Повержено',
  statShifts: 'Сдвиги Нави',
  statMaxResonance: 'Пик Резонанса',
  camOrbit: 'Орбита RPG',
  camIso: 'Изометрия',
  muteBtn: 'Звук',
  actionMapToggle: 'Карта топи',
  mapTitle: 'Карта Трясины и Острога',
  mapBtn: 'Карта',
  mapLegendHero: 'Витязь',
  mapLegendEnemy: 'Нечисть',
  mapLegendAltar: 'Алтарь Нави',
  mapLegendQuest: 'Тайны / Тотемы / Духи',
  mapLegendGateSealed: 'Врата запечатаны',
  mapLegendGateOpen: 'Врата открыты',
  promptMirror: 'Коснуться Зеркала Прошлого',
  promptSpiritDeal: 'Выслушать Духа Берёз',
  questEchoWhisper: 'Навь являет тень прошлого: отыщите 3 Осколка Эха на болотах.',
  questEchoShardFound: 'Осколок древней памяти отозвался в свете факела.',
  questEchoDone: 'Эхо предков очистило путь: +20 макс. Крови и +65 Пепла.',
  questTotemBurned: 'Проклятый Тотем Тьмы сожжён пламенем!',
  questTotemAllBurned: 'Все Тотемы выжжены — тёмный щит Волколака разрушен!',
  volkolakShieldedWhisper: 'Волколака хранят Тотемы Тьмы! Сожгите их Вспышкой пламени [2].',
  questSpiritTitle: 'Шёпот Берестяного Духа',
  questSpiritBody: '«Холодный пепел укрыл лощину, витязь. Поделись искрой Света (35), и я ослаблю корни Лешего да укреплю твой Резонанс. Или срази меня ради дикой Ярости.»',
  questSpiritOfferBtn: 'Отдать 35 Света (Сделка)',
  questSpiritRefuseBtn: 'Рассечь Духа (+50 Ярости)',
  questSpiritOffered: 'Сделка Духа: +1 Резонанса, корни Лешего ослаблены.',
  questSpiritRefused: 'Дух рассыпался пеплом — дикая Ярость наполнила секиру!',
  counterReady: 'Ответный удар Нави! (+45%)',
  wardActive: 'Оберег Сварога (-55% урона)',
  promptLoreStone: 'Прочесть резной камень',
  loreOstrog: 'Летопись камня I: «За три зимы до пепла старцы Острога ковали железные обереги от дышащего леса.»',
  loreMire: 'Летопись камня II: «На границе Яви и Нави утонувшая берёза помнит каждую клятву, шёпотом сказанную топям.»',
  loreBarrow: 'Летопись камня III: «Ни один клинок не возьмёт Волколака, пока чёрные тотемы пьют лунный свет над курганом.»',
  loreWatchpost: 'Летопись камня IV: «Дозорные оставили факелы горящими и ушли на север — в полые корни Лешего.»',
  questLoreFound: 'Древняя летопись открыта: +15 Пепла и +15 Ярости.',
  mapLegendLore: 'Резной камень летописи',
};

const UK: LocaleStrings = {
  ...RU,
  gameTitle: 'Навь і Попіл',
  gameSubtitle: 'Слов’янська Темна ARPG',
  playBtn: 'Увійти в Трясовину',
  settingsBtn: 'Налаштування',
  fullscreenEnter: 'На весь екран',
  fullscreenExit: 'Вийти з екрана',
  clickHeroHint: 'Натисніть на Витязя, щоб випробувати сталь',
  difficultyLabel: 'Складність',
  diffWanderer: 'Мандрівник',
  diffVityaz: 'Витязь',
  diffNightmare: 'Жахіття',
  diffOneLife: 'Одне Життя',
  diffOneLifeWarn: 'Смерть завершує похід назавжди',
  graphicsLabel: 'Якість графіки',
  gfxLow: 'Низька',
  gfxMedium: 'Середня',
  gfxHigh: 'Висока',
  gfxUltra: 'Ультра',
  languageLabel: 'Мова',
  audioLabel: 'Звук',
  masterVol: 'Загальна',
  musicVol: 'Музика',
  sfxVol: 'Ефекти',
  controlsTab: 'Керування',
  generalTab: 'Загальні',
  graphicsTab: 'Графіка',
  resetBindings: 'Скинути клавіші',
  pressAnyKey: 'Натисніть клавішу або кнопку миші...',
  closeBtn: 'Закрити',
  pauseTitle: 'Привал біля багаття',
  resumeBtn: 'Продовжити',
  restartBtn: 'Почати знову',
  quitToMenuBtn: 'Головне меню',
  victoryTitle: 'Лісовика Здолано',
  defeatTitle: 'Смолоскип Згас',
  playAgainBtn: 'Зіграти знову',
  hpLabel: 'Життя',
  spiritLabel: 'Лють',
  torchLabel: 'Світло',
  realmYav: 'Ява',
  realmNav: 'Темна Нава',
  ashesLabel: 'Попіл',
  objectiveExplore: 'Перетніть Березову трясовину та знищіть нечисть',
  objectiveShiftAltar: 'Торкніться Вівтаря Нави [E], щоб зруйнувати прокляту браму',
  objectiveSlayLeshy: 'Переможіть Охоронця Лісовика у Святилищі',
  objectiveCleared: 'Острог очищено від скверни',
  promptAltar: 'Активувати Вівтар Нави',
  promptTalkMara: 'Поговорити з Відункою Марою',
  actionEvade: 'Стрибок / Ривок',
  camOrbit: 'Орбіта RPG',
  camIso: 'Ізометрія',
};

const FR: LocaleStrings = {
  ...EN,
  gameTitle: 'Nav et Cendre',
  gameSubtitle: 'ARPG Slave Sombre',
  playBtn: 'Entrer dans le Marais',
  settingsBtn: 'Paramètres',
  fullscreenEnter: 'Plein écran',
  fullscreenExit: 'Quitter plein écran',
  clickHeroHint: 'Cliquez sur le guerrier pour tester l’acier',
  difficultyLabel: 'Difficulté',
  diffWanderer: 'Errant',
  diffVityaz: 'Vityaz',
  diffNightmare: 'Cauchemar',
  diffOneLife: 'Une Vie',
  diffOneLifeWarn: 'La mort met fin à la quête',
  graphicsLabel: 'Qualité Graphique',
  gfxLow: 'Bas',
  gfxMedium: 'Moyen',
  gfxHigh: 'Élevé',
  gfxUltra: 'Ultra',
  languageLabel: 'Langue',
  audioLabel: 'Audio',
  masterVol: 'Principal',
  musicVol: 'Musique',
  sfxVol: 'Effets',
  controlsTab: 'Contrôles',
  generalTab: 'Général',
  graphicsTab: 'Graphismes',
  resetBindings: 'Réinitialiser',
  pressAnyKey: 'Appuyez sur une touche ou un bouton...',
  closeBtn: 'Fermer',
  pauseTitle: 'Halte au Feu',
  resumeBtn: 'Reprendre',
  restartBtn: 'Recommencer',
  quitToMenuBtn: 'Menu Principal',
  victoryTitle: 'Le Leshy Terrassé',
  defeatTitle: 'Torche Éteinte',
  playAgainBtn: 'Rejouer',
  hpLabel: 'Vitalité',
  spiritLabel: 'Fureur',
  torchLabel: 'Torche',
  realmYav: 'Yav',
  realmNav: 'Sombre Nav',
  resonanceLabel: 'Résonance',
  ashesLabel: 'Cendres',
  camOrbit: 'Orbite RPG',
  camIso: 'Isométrique',
};

const DE: LocaleStrings = {
  ...EN,
  gameTitle: 'Nav und Asche',
  gameSubtitle: 'Dunkles Slawisches ARPG',
  playBtn: 'Sumpf betreten',
  settingsBtn: 'Einstellungen',
  fullscreenEnter: 'Vollbild',
  fullscreenExit: 'Vollbild beenden',
  clickHeroHint: 'Klicke den Recken an, um Stahl zu prüfen',
  difficultyLabel: 'Schwierigkeit',
  diffWanderer: 'Wanderer',
  diffVityaz: 'Witjas',
  diffNightmare: 'Albtraum',
  diffOneLife: 'Ein Leben',
  diffOneLifeWarn: 'Tod beendet den Lauf endgültig',
  graphicsLabel: 'Grafikqualität',
  gfxLow: 'Niedrig',
  gfxMedium: 'Mittel',
  gfxHigh: 'Hoch',
  gfxUltra: 'Ultra',
  languageLabel: 'Sprache',
  audioLabel: 'Ton',
  masterVol: 'Gesamt',
  musicVol: 'Musik',
  sfxVol: 'Effekte',
  controlsTab: 'Steuerung',
  generalTab: 'Allgemein',
  graphicsTab: 'Grafik',
  resetBindings: 'Standard wiederherstellen',
  pressAnyKey: 'Taste oder Maustaste drücken...',
  closeBtn: 'Schließen',
  pauseTitle: 'Lagerfeuer-Rast',
  resumeBtn: 'Fortsetzen',
  restartBtn: 'Neu starten',
  quitToMenuBtn: 'Hauptmenü',
  victoryTitle: 'Leschi Besiegt',
  defeatTitle: 'Fackel Erloschen',
  playAgainBtn: 'Erneut spielen',
  hpLabel: 'Lebenskraft',
  spiritLabel: 'Zorn',
  torchLabel: 'Fackel',
  realmYav: 'Jaw',
  realmNav: 'Dunkles Naw',
  resonanceLabel: 'Resonanz',
  ashesLabel: 'Asche',
  camOrbit: 'Orbit-RPG',
  camIso: 'Isometrisch',
};

const ES: LocaleStrings = {
  ...EN,
  gameTitle: 'Nav y Ceniza',
  gameSubtitle: 'ARPG Eslavo Oscuro',
  playBtn: 'Entrar al Pantano',
  settingsBtn: 'Ajustes',
  fullscreenEnter: 'Pantalla completa',
  fullscreenExit: 'Salir de pantalla',
  clickHeroHint: 'Haz clic en el guerrero para probar su acero',
  difficultyLabel: 'Dificultad',
  diffWanderer: 'Errante',
  diffVityaz: 'Vityaz',
  diffNightmare: 'Pesadilla',
  diffOneLife: 'Una Vida',
  diffOneLifeWarn: 'La muerte termina la partida',
  graphicsLabel: 'Calidad Gráfica',
  gfxLow: 'Baja',
  gfxMedium: 'Media',
  gfxHigh: 'Alta',
  gfxUltra: 'Ultra',
  languageLabel: 'Idioma',
  audioLabel: 'Audio',
  masterVol: 'Maestro',
  musicVol: 'Música',
  sfxVol: 'Efectos',
  controlsTab: 'Controles',
  generalTab: 'General',
  graphicsTab: 'Gráficos',
  resetBindings: 'Restablecer',
  pressAnyKey: 'Pulsa una tecla o botón...',
  closeBtn: 'Cerrar',
  pauseTitle: 'Descanso en la Hoguera',
  resumeBtn: 'Continuar',
  restartBtn: 'Reiniciar',
  quitToMenuBtn: 'Menú Principal',
  victoryTitle: 'Leshy Derrotado',
  defeatTitle: 'Antorcha Apagada',
  playAgainBtn: 'Jugar de nuevo',
  hpLabel: 'Vitalidad',
  spiritLabel: 'Furia',
  torchLabel: 'Antorcha',
  realmYav: 'Yav',
  realmNav: 'Nav Oscuro',
  resonanceLabel: 'Resonancia',
  ashesLabel: 'Cenizas',
};

const PT: LocaleStrings = {
  ...EN,
  gameTitle: 'Nav e Cinzas',
  gameSubtitle: 'ARPG Eslavo Sombrio',
  playBtn: 'Entrar no Pântano',
  settingsBtn: 'Configurações',
  fullscreenEnter: 'Tela cheia',
  fullscreenExit: 'Sair da tela cheia',
  clickHeroHint: 'Clique no guerreiro para testar o aço',
  difficultyLabel: 'Dificuldade',
  diffWanderer: 'Andarilho',
  diffVityaz: 'Vityaz',
  diffNightmare: 'Pesadelo',
  diffOneLife: 'Uma Vida',
  diffOneLifeWarn: 'A morte encerra a jornada',
  graphicsLabel: 'Qualidade Gráfica',
  gfxLow: 'Baixa',
  gfxMedium: 'Média',
  gfxHigh: 'Alta',
  gfxUltra: 'Ultra',
  languageLabel: 'Idioma',
  controlsTab: 'Controles',
  generalTab: 'Geral',
  graphicsTab: 'Gráficos',
  resetBindings: 'Redefinir',
  closeBtn: 'Fechar',
  pauseTitle: 'Fogueira',
  resumeBtn: 'Continuar',
  restartBtn: 'Reiniciar',
  quitToMenuBtn: 'Menu Principal',
  victoryTitle: 'Leshy Derrotado',
  defeatTitle: 'Tocha Apagada',
  playAgainBtn: 'Jogar Novamente',
  hpLabel: 'Vitalidade',
  spiritLabel: 'Fúria',
  torchLabel: 'Tocha',
};

const ZH: LocaleStrings = {
  ...EN,
  gameTitle: '纳维与灰烬',
  gameSubtitle: '黑暗斯拉夫动作RPG',
  playBtn: '踏入沼泽',
  settingsBtn: '设置',
  fullscreenEnter: '全屏',
  fullscreenExit: '退出全屏',
  clickHeroHint: '点击勇士试锋',
  difficultyLabel: '难度',
  diffWanderer: '流浪者',
  diffVityaz: '勇士',
  diffNightmare: '噩梦',
  diffOneLife: '一命模式',
  diffOneLifeWarn: '死亡将永久结束旅程',
  graphicsLabel: '画质',
  gfxLow: '低',
  gfxMedium: '中',
  gfxHigh: '高',
  gfxUltra: '极致',
  languageLabel: '语言',
  audioLabel: '音频',
  masterVol: '主音量',
  musicVol: '音乐',
  sfxVol: '音效',
  controlsTab: '控制',
  generalTab: '常规',
  graphicsTab: '图像',
  resetBindings: '恢复默认',
  pressAnyKey: '请按任意键或鼠标按键...',
  closeBtn: '关闭',
  pauseTitle: '篝火歇息',
  resumeBtn: '继续游戏',
  restartBtn: '重新开始',
  quitToMenuBtn: '返回主菜单',
  victoryTitle: '林妖已伏诛',
  defeatTitle: '火把已熄灭',
  playAgainBtn: '再战一次',
  hpLabel: '生命',
  spiritLabel: '怒气',
  torchLabel: '火光',
  realmYav: '现世',
  realmNav: '暗影纳维',
  resonanceLabel: '共鸣',
  ashesLabel: '灰烬',
};

const AR: LocaleStrings = {
  ...EN,
  gameTitle: 'ناف والرماد',
  gameSubtitle: 'لعبة أكشن سلافية مظلمة',
  playBtn: 'ادخل المستنقع',
  settingsBtn: 'الإعدادات',
  fullscreenEnter: 'ملء الشاشة',
  fullscreenExit: 'إنهاء ملء الشاشة',
  clickHeroHint: 'انقر على المحارب لاختبار النصل',
  difficultyLabel: 'الصعوبة',
  diffWanderer: 'رحالة',
  diffVityaz: 'فيتياث',
  diffNightmare: 'كابوس',
  diffOneLife: 'حياة واحدة',
  diffOneLifeWarn: 'الموت ينهي الرحلة للأبد',
  graphicsLabel: 'جودة الرسومات',
  gfxLow: 'منخفضة',
  gfxMedium: 'متوسطة',
  gfxHigh: 'عالية',
  gfxUltra: 'فائقة',
  languageLabel: 'اللغة',
  audioLabel: 'الصوت',
  masterVol: 'الرئيسي',
  musicVol: 'الموسيقى',
  sfxVol: 'المؤثرات',
  controlsTab: 'التحكم',
  generalTab: 'عام',
  graphicsTab: 'الرسومات',
  resetBindings: 'استعادة الافتراضي',
  pressAnyKey: 'اضغط أي زر أو مفتاح...',
  closeBtn: 'إغلاق',
  pauseTitle: 'استراحة النار',
  resumeBtn: 'متابعة',
  restartBtn: 'إعادة المحاولة',
  quitToMenuBtn: 'القائمة الرئيسية',
  victoryTitle: 'سقط ليشي',
  defeatTitle: 'انطفأت الشعلة',
  playAgainBtn: 'العب مجدداً',
  hpLabel: 'الحيوية',
  spiritLabel: 'الغضب',
  torchLabel: 'الشعلة',
  realmYav: 'ياف',
  realmNav: 'ناف المظلم',
  resonanceLabel: 'الرنين',
  ashesLabel: 'الرماد',
};

const JA: LocaleStrings = {
  ...EN,
  gameTitle: 'ナヴィと灰',
  gameSubtitle: 'ダーク・スラヴ・アクションRPG',
  playBtn: '湿地へ入る',
  settingsBtn: '設定',
  fullscreenEnter: '全画面',
  fullscreenExit: '全画面終了',
  clickHeroHint: '騎士をクリックして鋼を鳴らす',
  difficultyLabel: '難易度',
  diffWanderer: '放浪者',
  diffVityaz: 'ヴィチャズ',
  diffNightmare: '悪夢',
  diffOneLife: '一命',
  diffOneLifeWarn: '死は冒険の永久終了を意味する',
  graphicsLabel: 'グラフィック品質',
  gfxLow: '低',
  gfxMedium: '中',
  gfxHigh: '高',
  gfxUltra: '最高',
  languageLabel: '言語',
  audioLabel: 'オーディオ',
  masterVol: '全体',
  musicVol: '音楽',
  sfxVol: '効果音',
  controlsTab: '操作',
  generalTab: '一般',
  graphicsTab: '映像',
  resetBindings: '初期設定に戻す',
  pressAnyKey: 'キーまたはマウスボタンを押してください...',
  closeBtn: '閉じる',
  pauseTitle: '焚き火の休息',
  resumeBtn: '再開',
  restartBtn: 'やり直す',
  quitToMenuBtn: 'メインメニュー',
  victoryTitle: 'レーシィ討伐',
  defeatTitle: '松明が消えた',
  playAgainBtn: 'もう一度',
  hpLabel: '生命力',
  spiritLabel: '憤怒',
  torchLabel: '松明',
  realmYav: 'ヤヴィ',
  realmNav: '暗きナヴィ',
  resonanceLabel: '共鳴',
  ashesLabel: '灰',
};

const PL: LocaleStrings = {
  ...EN,
  gameTitle: 'Nawia i Popiół',
  gameSubtitle: 'Mroczne Słowiańskie ARPG',
  playBtn: 'Wejdź na Moczary',
  settingsBtn: 'Ustawienia',
  fullscreenEnter: 'Pełny ekran',
  fullscreenExit: 'Zamknij pełny ekran',
  clickHeroHint: 'Kliknij Witezia, by sprawdzić stal',
  difficultyLabel: 'Poziom trudności',
  diffWanderer: 'Wędrowiec',
  diffVityaz: 'Witeź',
  diffNightmare: 'Koszmar',
  diffOneLife: 'Jedno Życie',
  diffOneLifeWarn: 'Śmierć kończy wyprawę na zawsze',
  graphicsLabel: 'Jakość grafiki',
  gfxLow: 'Niska',
  gfxMedium: 'Średnia',
  gfxHigh: 'Wysoka',
  gfxUltra: 'Ultra',
  languageLabel: 'Język',
  controlsTab: 'Sterowanie',
  generalTab: 'Ogólne',
  graphicsTab: 'Grafika',
  resetBindings: 'Przywróć domyślne',
  closeBtn: 'Zamknij',
  pauseTitle: 'Odpoczynek przy Ognisku',
  resumeBtn: 'Wznów',
  restartBtn: 'Od nowa',
  quitToMenuBtn: 'Menu Główne',
  victoryTitle: 'Leszy Pokonany',
  defeatTitle: 'Pochodnia Zgasła',
  playAgainBtn: 'Zagraj ponownie',
  hpLabel: 'Żywotność',
  spiritLabel: 'Furia',
  torchLabel: 'Ogień',
};

const IT: LocaleStrings = {
  ...EN,
  gameTitle: 'Nav e Cenere',
  gameSubtitle: 'ARPG Slavo Oscuro',
  playBtn: 'Entra nella Palude',
  settingsBtn: 'Impostazioni',
  fullscreenEnter: 'Schermo intero',
  fullscreenExit: 'Esci da schermo intero',
  clickHeroHint: 'Clicca il guerriero per provare l’acciaio',
  difficultyLabel: 'Difficoltà',
  diffWanderer: 'Viandante',
  diffVityaz: 'Vityaz',
  diffNightmare: 'Incubo',
  diffOneLife: 'Una Vita',
  diffOneLifeWarn: 'La morte pone fine alla partita',
  graphicsLabel: 'Qualità Grafica',
  gfxLow: 'Bassa',
  gfxMedium: 'Media',
  gfxHigh: 'Alta',
  gfxUltra: 'Ultra',
  languageLabel: 'Lingua',
  controlsTab: 'Comandi',
  generalTab: 'Generale',
  graphicsTab: 'Grafica',
  resetBindings: 'Ripristina',
  closeBtn: 'Chiudi',
  pauseTitle: 'Riposo al Falò',
  resumeBtn: 'Riprendi',
  restartBtn: 'Ricomincia',
  quitToMenuBtn: 'Menu Principale',
  victoryTitle: 'Leshy Sconfitto',
  defeatTitle: 'Torcia Spenta',
  playAgainBtn: 'Gioca ancora',
  hpLabel: 'Vitalità',
  spiritLabel: 'Furia',
  torchLabel: 'Torcia',
};

const VI: LocaleStrings = {
  ...EN,
  gameTitle: 'Nav & Tro Tàn',
  gameSubtitle: 'Nhập vai Hành động Hắc ám',
  playBtn: 'Bước vào Đầm Lầy',
  settingsBtn: 'Cài đặt',
  fullscreenEnter: 'Toàn màn hình',
  fullscreenExit: 'Thoát toàn màn hình',
  clickHeroHint: 'Nhấp vào chiến binh để thử thép',
  difficultyLabel: 'Độ khó',
  diffWanderer: 'Lữ Khách',
  diffVityaz: 'Chiến Sĩ',
  diffNightmare: 'Ác Mộng',
  diffOneLife: 'Một Mạng',
  diffOneLifeWarn: 'Cái chết kết thúc vĩnh viễn',
  graphicsLabel: 'Chất lượng đồ họa',
  gfxLow: 'Thấp',
  gfxMedium: 'Trung bình',
  gfxHigh: 'Cao',
  gfxUltra: 'Tối đa',
  languageLabel: 'Ngôn ngữ',
  controlsTab: 'Điều khiển',
  generalTab: 'Chung',
  graphicsTab: 'Đồ họa',
  resetBindings: 'Mặc định',
  closeBtn: 'Đóng',
  pauseTitle: 'Nghỉ bên Lửa Trại',
  resumeBtn: 'Tiếp tục',
  restartBtn: 'Chơi lại',
  quitToMenuBtn: 'Menu Chính',
  victoryTitle: 'Leshy Đã Bị Hạ',
  defeatTitle: 'Đuốc Đã Tắt',
  playAgainBtn: 'Chơi lại',
  hpLabel: 'Sinh lực',
  spiritLabel: 'Cuồng nộ',
  torchLabel: 'Ngọn đuốc',
};

const FA: LocaleStrings = {
  ...EN,
  gameTitle: 'ناو و خاکستر',
  gameSubtitle: 'نقش‌آفرینی اکشن اسلاوی تاریک',
  playBtn: 'ورود به باتلاق',
  settingsBtn: 'تنظیمات',
  fullscreenEnter: 'تمام‌صفحه',
  fullscreenExit: 'خروج از تمام‌صفحه',
  clickHeroHint: 'برای آزمودن شمشیر روی جنگجو کلیک کنید',
  difficultyLabel: 'سختی',
  diffWanderer: 'سرگردان',
  diffVityaz: 'ویتیاتس',
  diffNightmare: 'کابوس',
  diffOneLife: 'یک جان',
  diffOneLifeWarn: 'مرگ پایان همیشگی سفر است',
  graphicsLabel: 'کیفیت گرافیک',
  gfxLow: 'کم',
  gfxMedium: 'متوسط',
  gfxHigh: 'بالا',
  gfxUltra: 'فوق‌العاده',
  languageLabel: 'زبان',
  audioLabel: 'صدا',
  masterVol: 'اصلی',
  musicVol: 'موسیقی',
  sfxVol: 'افکت‌ها',
  controlsTab: 'کنترل‌ها',
  generalTab: 'عمومی',
  graphicsTab: 'گرافیک',
  resetBindings: 'بازنشانی',
  pressAnyKey: 'کلید یا دکمه ماوس را بزنید...',
  closeBtn: 'بستن',
  pauseTitle: 'استراحت کنار آتش',
  resumeBtn: 'ادامه',
  restartBtn: 'شروع مجدد',
  quitToMenuBtn: 'منوی اصلی',
  victoryTitle: 'لشی شکست خورد',
  defeatTitle: 'مشعل خاموش شد',
  playAgainBtn: 'بازی دوباره',
  hpLabel: 'جان',
  spiritLabel: 'خشم',
  torchLabel: 'مشعل',
  realmYav: 'یاو',
  realmNav: 'ناو تاریک',
  resonanceLabel: 'طنین',
  ashesLabel: 'خاکستر',
};

const ELVISH: LocaleStrings = {
  ...EN,
  gameTitle: 'Dúath a Lith',
  gameSubtitle: 'Maethor na Taur Morn',
  playBtn: 'Minna i Loeg',
  settingsBtn: 'Teithad',
  fullscreenEnter: 'Aen-lhîw',
  fullscreenExit: 'Gwanna',
  clickHeroHint: 'Tango i Maethor an megil',
  difficultyLabel: 'Caun',
  diffWanderer: 'Randir',
  diffVityaz: 'Maethor',
  diffNightmare: 'Olos-morn',
  diffOneLife: 'Er-cuil',
  diffOneLifeWarn: 'Gurth na-dolen',
  graphicsLabel: 'Calad',
  languageLabel: 'Lam',
  controlsTab: 'Cam',
  generalTab: 'Pân',
  graphicsTab: 'Thêl',
  resetBindings: 'En-orthad',
  closeBtn: 'Hollen',
  pauseTitle: 'Sîdh na Naur',
  resumeBtn: 'Padra',
  restartBtn: 'Ed-padra',
  quitToMenuBtn: 'Men-ost',
  victoryTitle: 'Taur-bân Dangen',
  defeatTitle: 'Naur Lúthannen',
  playAgainBtn: 'Avo-bertha',
  hpLabel: 'Cuil',
  spiritLabel: 'Achas',
  torchLabel: 'Naur',
  realmYav: 'Calad',
  realmNav: 'Dúath',
  resonanceLabel: 'Linn',
  ashesLabel: 'Lith',
};

const ORCISH: LocaleStrings = {
  ...EN,
  gameTitle: 'Ghash-Bog & Ash',
  gameSubtitle: 'Zug-Dush Blood Brawl',
  playBtn: 'SMASH DA BOG',
  settingsBtn: 'Gears',
  fullscreenEnter: 'BIG SCREEN',
  fullscreenExit: 'SMALL SCREEN',
  clickHeroHint: 'Poke warboss ta bang shield!',
  difficultyLabel: 'Pain Level',
  diffWanderer: 'Softskin',
  diffVityaz: 'Grunt',
  diffNightmare: 'Brutal',
  diffOneLife: 'ONE SKULL',
  diffOneLifeWarn: 'Ya croak once, ya done!',
  graphicsLabel: 'Shiny Stuff',
  gfxLow: 'Mud',
  gfxMedium: 'Iron',
  gfxHigh: 'Sharp',
  gfxUltra: 'WARLORD',
  languageLabel: 'Tongue',
  controlsTab: 'Smash Keys',
  generalTab: 'War Camp',
  graphicsTab: 'Looks',
  resetBindings: 'Fix Keys',
  closeBtn: 'Shut It',
  pauseTitle: 'Catch Breath',
  resumeBtn: 'Back ta Krump',
  restartBtn: 'Fresh Fight',
  quitToMenuBtn: 'Leave Camp',
  victoryTitle: 'TREE-BOSS KRUMPED!',
  defeatTitle: 'TORCH DED. YA DED.',
  playAgainBtn: 'WAAAGH AGAIN!',
  hpLabel: 'Meat',
  spiritLabel: 'Rage',
  torchLabel: 'Fire',
  realmYav: 'Day-Mud',
  realmNav: 'Gloom-Pit',
  resonanceLabel: 'Hype',
  ashesLabel: 'Cinders',
};

export const LOCALES: Record<LanguageId, LocaleStrings> = {
  en: EN,
  fr: FR,
  de: DE,
  es: ES,
  pt: PT,
  zh: ZH,
  ar: AR,
  uk: UK,
  ru: RU,
  ja: JA,
  pl: PL,
  it: IT,
  vi: VI,
  fa: FA,
  elvish: ELVISH,
  orcish: ORCISH,
};

export function getLocaleDir(lang: LanguageId): 'ltr' | 'rtl' {
  return LANGUAGES.find((l) => l.id === lang)?.dir ?? 'ltr';
}

export function getStrings(lang: LanguageId): LocaleStrings {
  return LOCALES[lang] ?? EN;
}
