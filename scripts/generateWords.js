// Word data generator script
// Generates comprehensive word data for grades 3-6
const fs = require('fs');
const path = require('path');

// Grade 3 words - basic vocabulary for 3rd graders
const g3Raw = {
  animals: [
    ['dog','개'],['cat','고양이'],['bird','새'],['fish','물고기'],['lion','사자'],['tiger','호랑이'],['bear','곰'],['rabbit','토끼'],['mouse','쥐'],['duck','오리'],
    ['chicken','닭'],['pig','돼지'],['cow','소'],['horse','말'],['sheep','양'],['goat','염소'],['frog','개구리'],['snake','뱀'],['monkey','원숭이'],['elephant','코끼리'],
    ['giraffe','기린'],['zebra','얼룩말'],['penguin','펭귄'],['dolphin','돌고래'],['whale','고래'],['turtle','거북이'],['butterfly','나비'],['bee','벌'],['ant','개미'],['spider','거미'],
    ['ladybug','무당벌레'],['snail','달팽이'],['worm','벌레'],['shark','상어'],['octopus','문어'],['crab','게'],['starfish','불가사리'],['seahorse','해마'],['parrot','앵무새'],['owl','올빼미'],
    ['eagle','독수리'],['hawk','매'],['crow','까마귀'],['pigeon','비둘기'],['sparrow','참새'],['swan','백조'],['peacock','공작새'],['flamingo','플라밍고'],['bat','박쥐'],['deer','사슴'],
    ['fox','여우'],['wolf','늑대'],['squirrel','다람쥐'],['hamster','햄스터'],['goldfish','금붕어'],['puppy','강아지'],['kitten','새끼고양이'],['chick','병아리'],['lamb','어린양'],['pony','조랑말'],
    ['donkey','당나귀'],['camel','낙타'],['koala','코알라'],['kangaroo','캥거루'],['panda','판다'],['hippo','하마'],['rhino','코뿔소'],['gorilla','고릴라'],['cheetah','치타'],['leopard','표범'],
    ['seal','물개'],['otter','수달'],['raccoon','너구리'],['hedgehog','고슴도치'],['cricket','귀뚜라미'],['beetle','딱정벌레'],['dragonfly','잠자리'],['mosquito','모기'],['caterpillar','애벌레'],['rooster','수탉']
  ],
  fruits: [
    ['apple','사과'],['banana','바나나'],['orange','오렌지'],['grape','포도'],['strawberry','딸기'],['watermelon','수박'],['melon','멜론'],['peach','복숭아'],['pear','배'],['cherry','체리'],
    ['lemon','레몬'],['lime','라임'],['mango','망고'],['pineapple','파인애플'],['kiwi','키위'],['coconut','코코넛'],['blueberry','블루베리'],['raspberry','라즈베리'],['plum','자두'],['fig','무화과'],
    ['pomegranate','석류'],['avocado','아보카도'],['papaya','파파야'],['tangerine','귤'],['grapefruit','자몽'],['apricot','살구'],['persimmon','감'],['cantaloupe','칸탈루프'],['honeydew','허니듀멜론'],['cranberry','크랜베리']
  ],
  vegetables: [
    ['carrot','당근'],['potato','감자'],['onion','양파'],['tomato','토마토'],['cucumber','오이'],['pepper','고추'],['corn','옥수수'],['broccoli','브로콜리'],['spinach','시금치'],['lettuce','상추'],
    ['cabbage','양배추'],['garlic','마늘'],['ginger','생강'],['mushroom','버섯'],['pumpkin','호박'],['zucchini','주키니'],['eggplant','가지'],['celery','셀러리'],['pea','완두콩'],['bean','콩'],
    ['radish','무'],['turnip','순무'],['beet','비트'],['kale','케일'],['cauliflower','콜리플라워'],['sweet potato','고구마'],['green onion','파'],['parsley','파슬리'],['basil','바질'],['mint','민트']
  ],
  colors: [
    ['red','빨간색'],['blue','파란색'],['green','초록색'],['yellow','노란색'],['orange','주황색'],['purple','보라색'],['pink','분홍색'],['black','검은색'],['white','흰색'],['brown','갈색'],
    ['gray','회색'],['gold','금색'],['silver','은색'],['navy','남색'],['sky blue','하늘색'],['light green','연두색'],['dark green','짙은초록색'],['violet','보라색'],['indigo','남색'],['turquoise','청록색'],
    ['coral','산호색'],['maroon','적갈색'],['olive','올리브색'],['teal','청록색'],['ivory','상아색'],['cream','크림색'],['magenta','자홍색'],['beige','베이지색'],['crimson','진홍색'],['scarlet','주홍색']
  ],
  numbers: [
    ['one','하나'],['two','둘'],['three','셋'],['four','넷'],['five','다섯'],['six','여섯'],['seven','일곱'],['eight','여덟'],['nine','아홉'],['ten','열'],
    ['eleven','열하나'],['twelve','열둘'],['thirteen','열셋'],['fourteen','열넷'],['fifteen','열다섯'],['sixteen','열여섯'],['seventeen','열일곱'],['eighteen','열여덟'],['nineteen','열아홉'],['twenty','스물'],
    ['thirty','서른'],['forty','마흔'],['fifty','쉰'],['sixty','예순'],['seventy','일흔'],['eighty','여든'],['ninety','아흔'],['hundred','백'],['thousand','천'],['zero','영'],
    ['first','첫 번째'],['second','두 번째'],['third','세 번째'],['fourth','네 번째'],['fifth','다섯 번째'],['sixth','여섯 번째'],['seventh','일곱 번째'],['eighth','여덟 번째'],['ninth','아홉 번째'],['tenth','열 번째']
  ],
  family: [
    ['mother','어머니'],['father','아버지'],['brother','형/오빠/남동생'],['sister','언니/누나/여동생'],['baby','아기'],['grandmother','할머니'],['grandfather','할아버지'],['aunt','이모/고모'],['uncle','삼촌/외삼촌'],['cousin','사촌'],
    ['son','아들'],['daughter','딸'],['parent','부모'],['child','아이'],['family','가족'],['husband','남편'],['wife','아내'],['nephew','조카(남)'],['niece','조카(여)'],['twin','쌍둥이'],
    ['sibling','형제자매'],['relative','친척'],['grandchild','손주'],['ancestor','조상'],['descendant','자손']
  ],
  body: [
    ['head','머리'],['face','얼굴'],['eye','눈'],['ear','귀'],['nose','코'],['mouth','입'],['lip','입술'],['tooth','이'],['tongue','혀'],['hair','머리카락'],
    ['neck','목'],['shoulder','어깨'],['arm','팔'],['hand','손'],['finger','손가락'],['thumb','엄지'],['nail','손톱'],['chest','가슴'],['stomach','배'],['back','등'],
    ['leg','다리'],['knee','무릎'],['foot','발'],['toe','발가락'],['skin','피부'],['bone','뼈'],['heart','심장'],['brain','뇌'],['muscle','근육'],['elbow','팔꿈치'],
    ['wrist','손목'],['ankle','발목'],['hip','엉덩이'],['chin','턱'],['cheek','볼'],['forehead','이마'],['eyebrow','눈썹'],['eyelash','속눈썹'],['palm','손바닥'],['heel','발뒤꿈치']
  ],
  school: [
    ['school','학교'],['teacher','선생님'],['student','학생'],['class','수업'],['book','책'],['pencil','연필'],['pen','펜'],['eraser','지우개'],['ruler','자'],['bag','가방'],
    ['desk','책상'],['chair','의자'],['board','칠판'],['chalk','분필'],['notebook','공책'],['paper','종이'],['crayon','크레용'],['scissors','가위'],['glue','풀'],['tape','테이프'],
    ['homework','숙제'],['test','시험'],['grade','성적'],['lesson','수업'],['subject','과목'],['math','수학'],['science','과학'],['English','영어'],['Korean','국어'],['art','미술'],
    ['music','음악'],['gym','체육'],['library','도서관'],['playground','운동장'],['computer','컴퓨터'],['lunch','점심'],['recess','쉬는시간'],['principal','교장선생님'],['classroom','교실'],['hallway','복도'],
    ['locker','사물함'],['uniform','교복'],['backpack','책가방'],['textbook','교과서'],['dictionary','사전'],['calculator','계산기'],['marker','마커'],['paintbrush','붓'],['globe','지구본'],['map','지도']
  ],
  food: [
    ['bread','빵'],['rice','밥'],['noodle','국수'],['soup','국'],['salad','샐러드'],['pizza','피자'],['hamburger','햄버거'],['sandwich','샌드위치'],['cake','케이크'],['cookie','쿠키'],
    ['candy','사탕'],['chocolate','초콜릿'],['ice cream','아이스크림'],['milk','우유'],['juice','주스'],['water','물'],['tea','차'],['cheese','치즈'],['butter','버터'],['egg','달걀'],
    ['meat','고기'],['chicken','닭고기'],['fish','생선'],['beef','소고기'],['pork','돼지고기'],['bacon','베이컨'],['sausage','소시지'],['toast','토스트'],['cereal','시리얼'],['yogurt','요거트'],
    ['jam','잼'],['honey','꿀'],['sugar','설탕'],['salt','소금'],['oil','기름'],['pasta','파스타'],['dumpling','만두'],['steak','스테이크'],['pie','파이'],['muffin','머핀'],
    ['donut','도넛'],['popcorn','팝콘'],['waffle','와플'],['pancake','팬케이크'],['french fries','감자튀김'],['hot dog','핫도그'],['taco','타코'],['fried rice','볶음밥'],['curry','카레'],['ramen','라면']
  ],
  weather: [
    ['sun','태양'],['moon','달'],['star','별'],['cloud','구름'],['rain','비'],['snow','눈'],['wind','바람'],['storm','폭풍'],['rainbow','무지개'],['sky','하늘'],
    ['tree','나무'],['flower','꽃'],['grass','풀'],['leaf','나뭇잎'],['river','강'],['lake','호수'],['ocean','바다'],['sea','바다'],['mountain','산'],['hill','언덕'],
    ['forest','숲'],['desert','사막'],['island','섬'],['beach','해변'],['sand','모래'],['rock','바위'],['stone','돌'],['ice','얼음'],['fog','안개'],['thunder','천둥'],
    ['lightning','번개'],['sunny','화창한'],['cloudy','흐린'],['rainy','비오는'],['snowy','눈오는'],['windy','바람부는'],['hot','뜨거운'],['cold','추운'],['warm','따뜻한'],['cool','시원한'],
    ['spring','봄'],['summer','여름'],['fall','가을'],['winter','겨울'],['weather','날씨'],['temperature','온도'],['frost','서리'],['dew','이슬'],['breeze','산들바람'],['mud','진흙']
  ],
  places: [
    ['house','집'],['home','가정'],['room','방'],['door','문'],['window','창문'],['wall','벽'],['floor','바닥'],['ceiling','천장'],['roof','지붕'],['garden','정원'],
    ['kitchen','부엌'],['bathroom','욕실'],['bedroom','침실'],['living room','거실'],['garage','차고'],['stairs','계단'],['store','가게'],['shop','상점'],['market','시장'],['hospital','병원'],
    ['church','교회'],['library','도서관'],['bank','은행'],['restaurant','식당'],['cafe','카페'],['park','공원'],['zoo','동물원'],['museum','박물관'],['theater','극장'],['airport','공항'],
    ['station','역'],['bridge','다리'],['road','도로'],['street','거리'],['building','건물'],['apartment','아파트'],['office','사무실'],['factory','공장'],['farm','농장'],['castle','성'],
    ['palace','궁전'],['tower','탑'],['temple','사원'],['village','마을'],['city','도시'],['pool','수영장'],['gym','체육관'],['hotel','호텔'],['bakery','빵집'],['pharmacy','약국']
  ],
  clothes: [
    ['shirt','셔츠'],['pants','바지'],['dress','원피스'],['skirt','치마'],['jacket','자켓'],['coat','코트'],['hat','모자'],['cap','야구모자'],['shoes','신발'],['boots','부츠'],
    ['socks','양말'],['gloves','장갑'],['scarf','목도리'],['belt','벨트'],['tie','넥타이'],['uniform','유니폼'],['pajamas','잠옷'],['swimsuit','수영복'],['sweater','스웨터'],['hoodie','후드티'],
    ['jeans','청바지'],['shorts','반바지'],['sandals','샌들'],['sneakers','운동화'],['slippers','슬리퍼'],['raincoat','우비'],['vest','조끼'],['blouse','블라우스'],['robe','가운'],['underwear','속옷']
  ],
  feelings: [
    ['happy','행복한'],['sad','슬픈'],['angry','화난'],['scared','무서운'],['tired','피곤한'],['hungry','배고픈'],['thirsty','목마른'],['sick','아픈'],['good','좋은'],['bad','나쁜'],
    ['big','큰'],['small','작은'],['tall','키큰'],['short','짧은'],['long','긴'],['new','새로운'],['old','오래된'],['fast','빠른'],['slow','느린'],['hot','뜨거운'],
    ['cold','차가운'],['pretty','예쁜'],['nice','좋은'],['kind','친절한'],['brave','용감한'],['shy','수줍은'],['funny','재미있는'],['serious','진지한'],['quiet','조용한'],['loud','시끄러운'],
    ['soft','부드러운'],['hard','딱딱한'],['easy','쉬운'],['difficult','어려운'],['heavy','무거운'],['light','가벼운'],['clean','깨끗한'],['dirty','더러운'],['strong','강한'],['weak','약한'],
    ['smart','똑똑한'],['young','젊은'],['beautiful','아름다운'],['amazing','놀라운'],['wonderful','훌륭한'],['terrible','끔찍한'],['excellent','우수한'],['perfect','완벽한'],['gentle','부드러운'],['fierce','사나운']
  ],
  verbs: [
    ['be','~이다'],['have','가지다'],['do','하다'],['go','가다'],['come','오다'],['make','만들다'],['say','말하다'],['see','보다'],['look','바라보다'],['find','찾다'],
    ['give','주다'],['take','가져가다'],['get','얻다'],['know','알다'],['think','생각하다'],['want','원하다'],['need','필요하다'],['like','좋아하다'],['love','사랑하다'],['hate','싫어하다'],
    ['eat','먹다'],['drink','마시다'],['sleep','자다'],['wake','일어나다'],['run','달리다'],['walk','걷다'],['jump','점프하다'],['sit','앉다'],['stand','서다'],['fly','날다'],
    ['swim','수영하다'],['sing','노래하다'],['dance','춤추다'],['play','놀다'],['read','읽다'],['write','쓰다'],['draw','그리다'],['paint','칠하다'],['cook','요리하다'],['clean','청소하다'],
    ['wash','씻다'],['open','열다'],['close','닫다'],['start','시작하다'],['stop','멈추다'],['help','돕다'],['try','시도하다'],['use','사용하다'],['work','일하다'],['study','공부하다'],
    ['teach','가르치다'],['learn','배우다'],['listen','듣다'],['speak','말하다'],['talk','이야기하다'],['ask','물어보다'],['answer','대답하다'],['tell','말해주다'],['show','보여주다'],['move','움직이다'],
    ['carry','들다'],['hold','잡다'],['put','놓다'],['pull','당기다'],['push','밀다'],['throw','던지다'],['catch','잡다'],['kick','차다'],['hit','치다'],['cut','자르다'],
    ['build','짓다'],['break','부수다'],['fix','고치다'],['turn','돌다'],['grow','자라다'],['fall','넘어지다'],['feel','느끼다'],['touch','만지다'],['smell','냄새맡다'],['taste','맛보다'],
    ['hear','듣다'],['remember','기억하다'],['forget','잊다'],['wait','기다리다'],['hurry','서두르다'],['laugh','웃다'],['cry','울다'],['smile','미소짓다'],['clap','박수치다'],['wave','손흔들다'],
    ['follow','따라가다'],['lead','이끌다'],['win','이기다'],['lose','지다'],['begin','시작하다'],['end','끝나다'],['live','살다'],['bring','가져오다'],['send','보내다'],['share','나누다']
  ],
  adverbs: [
    ['here','여기'],['there','저기'],['now','지금'],['then','그때'],['today','오늘'],['tomorrow','내일'],['yesterday','어제'],['always','항상'],['never','절대~않다'],['sometimes','가끔'],
    ['often','자주'],['usually','보통'],['very','매우'],['really','정말'],['too','또한'],['also','역시'],['again','다시'],['still','여전히'],['just','방금'],['already','이미'],
    ['soon','곧'],['early','일찍'],['late','늦게'],['fast','빠르게'],['slowly','천천히'],['well','잘'],['together','함께'],['alone','혼자'],['inside','안에'],['outside','밖에'],
    ['up','위로'],['down','아래로'],['left','왼쪽'],['right','오른쪽'],['front','앞'],['back','뒤'],['near','가까이'],['far','멀리'],['above','위에'],['below','아래에'],
    ['between','사이에'],['around','주위에'],['through','통과하여'],['along','따라서'],['across','건너서'],['behind','뒤에'],['beside','옆에'],['under','밑에'],['over','위에'],['before','전에']
  ],
  time: [
    ['time','시간'],['day','낮'],['night','밤'],['morning','아침'],['afternoon','오후'],['evening','저녁'],['week','주'],['month','달'],['year','해'],['Monday','월요일'],
    ['Tuesday','화요일'],['Wednesday','수요일'],['Thursday','목요일'],['Friday','금요일'],['Saturday','토요일'],['Sunday','일요일'],['January','1월'],['February','2월'],['March','3월'],['April','4월'],
    ['May','5월'],['June','6월'],['July','7월'],['August','8월'],['September','9월'],['October','10월'],['November','11월'],['December','12월'],['hour','시'],['minute','분'],
    ['second','초'],['birthday','생일'],['holiday','휴일'],['vacation','방학'],['Christmas','크리스마스'],['Halloween','할로윈'],['party','파티'],['gift','선물'],['present','선물'],['surprise','놀라움'],
    ['candle','양초'],['balloon','풍선'],['ribbon','리본'],['card','카드'],['calendar','달력'],['clock','시계'],['watch','손목시계'],['alarm','알람'],['schedule','일정'],['weekend','주말']
  ]
};

// Grade 4 words
const g4Raw = {
  jobs: [
    ['doctor','의사'],['nurse','간호사'],['firefighter','소방관'],['police officer','경찰관'],['teacher','선생님'],['farmer','농부'],['cook','요리사'],['chef','주방장'],['pilot','조종사'],['driver','운전기사'],
    ['dentist','치과의사'],['vet','수의사'],['singer','가수'],['actor','배우'],['dancer','무용가'],['painter','화가'],['writer','작가'],['scientist','과학자'],['astronaut','우주비행사'],['engineer','기술자'],
    ['lawyer','변호사'],['judge','판사'],['soldier','군인'],['sailor','선원'],['builder','건축가'],['mechanic','정비사'],['plumber','배관공'],['electrician','전기기사'],['carpenter','목수'],['baker','제빵사'],
    ['butcher','정육점주인'],['waiter','웨이터'],['cashier','계산원'],['reporter','기자'],['photographer','사진작가'],['designer','디자이너'],['programmer','프로그래머'],['athlete','운동선수'],['coach','코치'],['referee','심판'],
    ['librarian','사서'],['pharmacist','약사'],['architect','건축가'],['accountant','회계사'],['detective','탐정'],['guard','경비원'],['captain','선장'],['president','대통령'],['king','왕'],['queen','여왕']
  ],
  transportation: [
    ['car','자동차'],['bus','버스'],['train','기차'],['airplane','비행기'],['ship','배'],['boat','보트'],['bicycle','자전거'],['motorcycle','오토바이'],['taxi','택시'],['truck','트럭'],
    ['van','밴'],['ambulance','구급차'],['fire truck','소방차'],['police car','경찰차'],['helicopter','헬리콥터'],['rocket','로켓'],['submarine','잠수함'],['ferry','페리'],['sailboat','돛배'],['canoe','카누'],
    ['scooter','스쿠터'],['skateboard','스케이트보드'],['wagon','마차'],['sled','썰매'],['tram','트램'],['metro','지하철'],['subway','지하철'],['monorail','모노레일'],['cable car','케이블카'],['hot air balloon','열기구'],
    ['jet','제트기'],['yacht','요트'],['raft','뗏목'],['kayak','카약'],['surfboard','서핑보드'],['wheelchair','휠체어'],['stroller','유모차'],['elevator','엘리베이터'],['escalator','에스컬레이터'],['roller skate','롤러스케이트']
  ],
  science: [
    ['space','우주'],['planet','행성'],['Earth','지구'],['Mars','화성'],['Venus','금성'],['Jupiter','목성'],['Saturn','토성'],['Mercury','수성'],['Neptune','해왕성'],['Uranus','천왕성'],
    ['galaxy','은하'],['universe','우주'],['astronaut','우주인'],['rocket','로켓'],['satellite','위성'],['telescope','망원경'],['orbit','궤도'],['gravity','중력'],['comet','혜성'],['asteroid','소행성'],
    ['meteor','유성'],['constellation','별자리'],['atmosphere','대기'],['oxygen','산소'],['carbon','탄소'],['hydrogen','수소'],['nitrogen','질소'],['energy','에너지'],['electricity','전기'],['magnet','자석'],
    ['battery','배터리'],['robot','로봇'],['computer','컴퓨터'],['internet','인터넷'],['program','프로그램'],['data','데이터'],['experiment','실험'],['laboratory','실험실'],['microscope','현미경'],['temperature','온도'],
    ['chemical','화학물질'],['molecule','분자'],['atom','원자'],['cell','세포'],['gene','유전자'],['DNA','DNA'],['evolution','진화'],['fossil','화석'],['mineral','광물'],['crystal','결정']
  ],
  sports: [
    ['soccer','축구'],['baseball','야구'],['basketball','농구'],['tennis','테니스'],['volleyball','배구'],['badminton','배드민턴'],['swimming','수영'],['running','달리기'],['jumping','점프'],['climbing','등반'],
    ['skating','스케이팅'],['skiing','스키'],['surfing','서핑'],['cycling','사이클링'],['hiking','하이킹'],['camping','캠핑'],['fishing','낚시'],['bowling','볼링'],['golf','골프'],['boxing','복싱'],
    ['wrestling','레슬링'],['martial arts','무술'],['yoga','요가'],['gymnastics','체조'],['archery','양궁'],['fencing','펜싱'],['rowing','조정'],['diving','다이빙'],['chess','체스'],['puzzle','퍼즐'],
    ['board game','보드게임'],['card game','카드게임'],['video game','비디오게임'],['drawing','그리기'],['painting','그림그리기'],['singing','노래부르기'],['dancing','춤추기'],['cooking','요리하기'],['baking','제과'],['gardening','정원가꾸기'],
    ['reading','독서'],['writing','글쓰기'],['photography','사진촬영'],['knitting','뜨개질'],['pottery','도자기'],['origami','종이접기'],['magic','마술'],['juggling','저글링'],['collecting','수집'],['traveling','여행']
  ],
  emotions: [
    ['excited','신이난'],['nervous','긴장한'],['worried','걱정하는'],['surprised','놀란'],['confused','혼란스러운'],['bored','지루한'],['proud','자랑스러운'],['jealous','질투하는'],['grateful','감사하는'],['embarrassed','당황한'],
    ['frustrated','좌절한'],['disappointed','실망한'],['relieved','안도하는'],['curious','호기심있는'],['confident','자신감있는'],['lonely','외로운'],['guilty','죄책감드는'],['ashamed','부끄러운'],['hopeful','희망찬'],['hopeless','절망적인'],
    ['anxious','불안한'],['cheerful','쾌활한'],['grumpy','짜증난'],['moody','변덕스러운'],['peaceful','평화로운'],['restless','불안한'],['satisfied','만족한'],['miserable','비참한'],['delighted','기쁜'],['thrilled','매우신난'],
    ['terrified','무서워하는'],['furious','격노한'],['depressed','우울한'],['content','만족하는'],['overwhelmed','압도된'],['inspired','영감받은'],['motivated','동기부여된'],['lazy','게으른'],['energetic','활기찬'],['exhausted','지쳐있는']
  ],
  comparatives: [
    ['bigger','더 큰'],['biggest','가장 큰'],['smaller','더 작은'],['smallest','가장 작은'],['taller','더 큰'],['tallest','가장 큰'],['shorter','더 짧은'],['shortest','가장 짧은'],['longer','더 긴'],['longest','가장 긴'],
    ['faster','더 빠른'],['fastest','가장 빠른'],['slower','더 느린'],['slowest','가장 느린'],['better','더 좋은'],['best','가장 좋은'],['worse','더 나쁜'],['worst','가장 나쁜'],['more','더 많은'],['most','가장 많은'],
    ['less','더 적은'],['least','가장 적은'],['younger','더 어린'],['youngest','가장 어린'],['older','더 나이든'],['oldest','가장 나이든'],['newer','더 새로운'],['newest','가장 새로운'],['larger','더 큰'],['largest','가장 큰'],
    ['thinner','더 얇은'],['thinnest','가장 얇은'],['thicker','더 두꺼운'],['thickest','가장 두꺼운'],['wider','더 넓은'],['widest','가장 넓은'],['deeper','더 깊은'],['deepest','가장 깊은'],['higher','더 높은'],['highest','가장 높은'],
    ['lower','더 낮은'],['lowest','가장 낮은'],['brighter','더 밝은'],['brightest','가장 밝은'],['darker','더 어두운'],['darkest','가장 어두운'],['louder','더 시끄러운'],['loudest','가장 시끄러운'],['heavier','더 무거운'],['heaviest','가장 무거운']
  ],
  advancedVerbs: [
    ['agree','동의하다'],['disagree','동의하지않다'],['allow','허락하다'],['refuse','거절하다'],['appear','나타나다'],['disappear','사라지다'],['arrive','도착하다'],['leave','떠나다'],['attack','공격하다'],['defend','방어하다'],
    ['believe','믿다'],['doubt','의심하다'],['belong','속하다'],['borrow','빌리다'],['lend','빌려주다'],['celebrate','축하하다'],['change','바꾸다'],['choose','선택하다'],['collect','모으다'],['compare','비교하다'],
    ['compete','경쟁하다'],['complete','완성하다'],['connect','연결하다'],['continue','계속하다'],['control','조절하다'],['create','창조하다'],['decide','결정하다'],['deliver','배달하다'],['describe','묘사하다'],['destroy','파괴하다'],
    ['develop','발전하다'],['discover','발견하다'],['discuss','토론하다'],['divide','나누다'],['earn','벌다'],['enjoy','즐기다'],['enter','들어가다'],['escape','탈출하다'],['examine','조사하다'],['exchange','교환하다'],
    ['exercise','운동하다'],['expect','기대하다'],['explain','설명하다'],['explore','탐험하다'],['express','표현하다'],['fail','실패하다'],['fight','싸우다'],['fill','채우다'],['finish','끝내다'],['float','뜨다'],
    ['flow','흐르다'],['fold','접다'],['gather','모이다'],['guess','추측하다'],['guide','안내하다'],['handle','다루다'],['hang','걸다'],['hide','숨다'],['imagine','상상하다'],['improve','개선하다'],
    ['include','포함하다'],['increase','증가하다'],['introduce','소개하다'],['invent','발명하다'],['invite','초대하다'],['join','합류하다'],['keep','유지하다'],['lay','놓다'],['lift','들어올리다'],['measure','측정하다'],
    ['mention','언급하다'],['mix','섞다'],['notice','알아차리다'],['offer','제안하다'],['order','주문하다'],['pack','짐을싸다'],['perform','수행하다'],['permit','허용하다'],['prepare','준비하다'],['protect','보호하다']
  ],
  grammar: [
    ['what','무엇'],['when','언제'],['where','어디'],['who','누구'],['why','왜'],['how','어떻게'],['which','어느것'],['whose','누구의'],['that','저것'],['this','이것'],
    ['these','이것들'],['those','저것들'],['some','어떤'],['any','어떤~이든'],['many','많은'],['much','많은'],['few','적은'],['little','조금'],['all','모든'],['both','둘다'],
    ['each','각각'],['every','모든'],['either','둘중하나'],['neither','둘다~않다'],['another','다른하나'],['other','다른'],['own','자신의'],['same','같은'],['different','다른'],['such','그런'],
    ['quite','꽤'],['rather','차라리'],['enough','충분한'],['almost','거의'],['nearly','거의'],['hardly','거의~않다'],['probably','아마도'],['possibly','아마'],['certainly','확실히'],['definitely','분명히'],
    ['actually','사실은'],['especially','특히'],['finally','마침내'],['suddenly','갑자기'],['quickly','빠르게'],['carefully','조심히'],['easily','쉽게'],['usually','보통'],['simply','간단히'],['exactly','정확히'],
    ['completely','완전히'],['absolutely','절대적으로'],['immediately','즉시'],['recently','최근에'],['naturally','자연스럽게'],['obviously','분명히'],['unfortunately','불행히도'],['fortunately','다행히도'],['seriously','진지하게'],['basically','기본적으로']
  ]
};

// Grade 5 words
const g5Raw = {
  environment: [
    ['environment','환경'],['pollution','오염'],['climate','기후'],['recycle','재활용하다'],['endangered','멸종위기의'],['extinct','멸종된'],['habitat','서식지'],['ecosystem','생태계'],['conservation','보존'],['renewable','재생가능한'],
    ['solar','태양의'],['rainforest','열대우림'],['jungle','정글'],['tundra','동토'],['valley','계곡'],['canyon','협곡'],['volcano','화산'],['earthquake','지진'],['tsunami','쓰나미'],['hurricane','허리케인'],
    ['tornado','토네이도'],['flood','홍수'],['drought','가뭄'],['glacier','빙하'],['continent','대륙'],['country','나라'],['capital','수도'],['border','국경'],['population','인구'],['region','지역'],
    ['peninsula','반도'],['coast','해안'],['cliff','절벽'],['cave','동굴'],['waterfall','폭포'],['swamp','늪'],['oasis','오아시스'],['reef','암초'],['plateau','고원'],['erosion','침식'],
    ['prairie','대초원'],['delta','삼각주'],['dune','모래언덕'],['geyser','간헐천'],['landslide','산사태'],['avalanche','눈사태'],['iceberg','빙산'],['strait','해협'],['bay','만'],['harbor','항구']
  ],
  history: [
    ['history','역사'],['ancient','고대의'],['modern','현대의'],['century','세기'],['civilization','문명'],['empire','제국'],['kingdom','왕국'],['revolution','혁명'],['independence','독립'],['democracy','민주주의'],
    ['government','정부'],['president','대통령'],['constitution','헌법'],['law','법'],['freedom','자유'],['peace','평화'],['war','전쟁'],['battle','전투'],['army','군대'],['weapon','무기'],
    ['shield','방패'],['sword','검'],['castle','성'],['throne','왕좌'],['crown','왕관'],['flag','국기'],['nation','국가'],['citizen','시민'],['culture','문화'],['tradition','전통'],
    ['festival','축제'],['ceremony','의식'],['heritage','유산'],['monument','기념비'],['museum','박물관'],['treaty','조약'],['alliance','동맹'],['trade','무역'],['economy','경제'],['currency','화폐'],
    ['invention','발명'],['colony','식민지'],['armor','갑옷'],['document','문서'],['artifact','유물'],['conquest','정복'],['dynasty','왕조'],['medieval','중세의'],['renaissance','르네상스'],['slavery','노예제도']
  ],
  technology: [
    ['technology','기술'],['robot','로봇'],['drone','드론'],['smartphone','스마트폰'],['tablet','태블릿'],['laptop','노트북'],['software','소프트웨어'],['hardware','하드웨어'],['application','앱'],['download','다운로드'],
    ['website','웹사이트'],['cloud','클라우드'],['server','서버'],['database','데이터베이스'],['algorithm','알고리즘'],['coding','코딩'],['programming','프로그래밍'],['network','네트워크'],['wireless','무선'],['GPS','GPS'],
    ['sensor','센서'],['automation','자동화'],['password','비밀번호'],['digital','디지털'],['pixel','픽셀'],['streaming','스트리밍'],['podcast','팟캐스트'],['blog','블로그'],['notification','알림'],['update','업데이트'],
    ['virtual reality','가상현실'],['artificial intelligence','인공지능'],['3D printing','3D프린팅'],['cybersecurity','사이버보안'],['encryption','암호화'],['upload','업로드'],['storage','저장장치'],['memory','메모리'],['processor','프로세서'],['screen','화면']
  ],
  health: [
    ['health','건강'],['disease','질병'],['symptom','증상'],['medicine','약'],['vaccine','백신'],['surgery','수술'],['hospital','병원'],['emergency','응급'],['ambulance','구급차'],['bandage','붕대'],
    ['therapy','치료'],['diet','식단'],['nutrition','영양'],['vitamin','비타민'],['protein','단백질'],['calorie','칼로리'],['exercise','운동'],['fitness','체력'],['allergy','알레르기'],['fever','열'],
    ['infection','감염'],['virus','바이러스'],['bacteria','세균'],['immune','면역의'],['diagnosis','진단'],['treatment','치료'],['cure','치료법'],['recovery','회복'],['stress','스트레스'],['hygiene','위생'],
    ['mental health','정신건강'],['anxiety','불안'],['depression','우울증'],['meditation','명상'],['first aid','응급처치'],['injection','주사'],['prescription','처방전'],['pharmacy','약국'],['checkup','검진'],['blood pressure','혈압']
  ],
  advancedVerbs: [
    ['absorb','흡수하다'],['accomplish','달성하다'],['achieve','이루다'],['acquire','획득하다'],['adapt','적응하다'],['adjust','조정하다'],['admire','존경하다'],['adopt','채택하다'],['advance','전진하다'],['advertise','광고하다'],
    ['affect','영향주다'],['afford','여유가있다'],['analyze','분석하다'],['announce','발표하다'],['anticipate','예상하다'],['apologize','사과하다'],['appreciate','감사하다'],['approach','접근하다'],['approve','승인하다'],['arrange','배열하다'],
    ['assist','돕다'],['assume','가정하다'],['attempt','시도하다'],['attract','끌다'],['avoid','피하다'],['balance','균형잡다'],['behave','행동하다'],['benefit','이익을주다'],['blame','비난하다'],['boost','높이다'],
    ['calculate','계산하다'],['capture','포착하다'],['challenge','도전하다'],['claim','주장하다'],['clarify','명확히하다'],['classify','분류하다'],['collapse','무너지다'],['combine','결합하다'],['commit','헌신하다'],['communicate','소통하다'],
    ['concentrate','집중하다'],['conclude','결론짓다'],['conduct','수행하다'],['confirm','확인하다'],['confuse','혼동하다'],['consider','고려하다'],['consist','구성되다'],['construct','건설하다'],['consume','소비하다'],['contain','포함하다']
  ],
  advancedNouns: [
    ['ability','능력'],['absence','부재'],['access','접근'],['achievement','성취'],['action','행동'],['addition','추가'],['administration','관리'],['advantage','장점'],['adventure','모험'],['advice','조언'],
    ['agreement','동의'],['agriculture','농업'],['alternative','대안'],['amount','양'],['analysis','분석'],['anniversary','기념일'],['announcement','발표'],['anxiety','불안'],['appearance','외모'],['application','적용'],
    ['appreciation','감사'],['approach','접근법'],['approval','승인'],['argument','논쟁'],['arrangement','배치'],['aspect','측면'],['assessment','평가'],['assistance','지원'],['association','연합'],['assumption','가정'],
    ['atmosphere','분위기'],['attempt','시도'],['attention','주의'],['attitude','태도'],['authority','권위'],['awareness','인식'],['background','배경'],['balance','균형'],['barrier','장벽'],['basis','기초'],
    ['behavior','행동'],['belief','믿음'],['benefit','이익'],['biography','전기'],['boundary','경계'],['budget','예산'],['burden','짐'],['campaign','캠페인'],['capacity','용량'],['category','범주']
  ]
};

// Grade 6 words
const g6Raw = {
  academic: [
    ['literature','문학'],['mathematics','수학'],['geometry','기하학'],['algebra','대수학'],['statistics','통계학'],['biology','생물학'],['chemistry','화학'],['physics','물리학'],['astronomy','천문학'],['geology','지질학'],
    ['psychology','심리학'],['philosophy','철학'],['sociology','사회학'],['economics','경제학'],['politics','정치학'],['anthropology','인류학'],['archaeology','고고학'],['linguistics','언어학'],['architecture','건축학'],['engineering','공학'],
    ['medicine','의학'],['ecology','생태학'],['meteorology','기상학'],['oceanography','해양학'],['genetics','유전학'],['robotics','로봇공학'],['biotechnology','생명공학'],['forensics','법의학'],['cartography','지도학'],['etymology','어원학'],
    ['immunology','면역학'],['neuroscience','신경과학'],['pharmacology','약리학'],['physiology','생리학'],['taxonomy','분류학'],['zoology','동물학'],['botany','식물학'],['microbiology','미생물학'],['acoustics','음향학'],['thermodynamics','열역학']
  ],
  abstractNouns: [
    ['achievement','성취'],['advantage','장점'],['ambition','야망'],['analysis','분석'],['appearance','외관'],['appreciation','감상'],['approach','접근'],['argument','논쟁'],['assumption','가정'],['atmosphere','분위기'],
    ['attitude','태도'],['authority','권위'],['awareness','인식'],['behavior','행동'],['belief','신념'],['benefit','혜택'],['boundary','경계'],['career','진로'],['category','범주'],['celebration','축하'],
    ['challenge','도전'],['characteristic','특성'],['circumstance','상황'],['civilization','문명'],['combination','조합'],['communication','소통'],['community','공동체'],['comparison','비교'],['competition','경쟁'],['concept','개념'],
    ['conclusion','결론'],['condition','조건'],['confidence','자신감'],['conflict','갈등'],['connection','연결'],['conscience','양심'],['consequence','결과'],['consideration','고려'],['construction','건설'],['contribution','기여']
  ],
  connectors: [
    ['however','그러나'],['therefore','그러므로'],['moreover','게다가'],['furthermore','더나아가'],['meanwhile','한편'],['nevertheless','그럼에도불구하고'],['otherwise','그렇지않으면'],['instead','대신에'],['indeed','사실'],['besides','게다가'],
    ['consequently','결과적으로'],['accordingly','따라서'],['similarly','비슷하게'],['likewise','마찬가지로'],['conversely','반대로'],['alternatively','또는'],['subsequently','그후에'],['eventually','결국'],['ultimately','궁극적으로'],['apparently','분명히'],
    ['approximately','대략'],['considerably','상당히'],['frequently','자주'],['gradually','점차'],['increasingly','점점더'],['occasionally','가끔'],['particularly','특히'],['potentially','잠재적으로'],['primarily','주로'],['significantly','상당히']
  ],
  phrasalVerbs: [
    ['break down','고장나다'],['break up','헤어지다'],['bring up','키우다'],['call off','취소하다'],['carry on','계속하다'],['catch up','따라잡다'],['check in','체크인하다'],['come across','우연히만나다'],['come up with','생각해내다'],['cut down','줄이다'],
    ['deal with','다루다'],['drop off','내려주다'],['end up','결국~하다'],['fall apart','무너지다'],['figure out','알아내다'],['fill in','채워넣다'],['find out','발견하다'],['get along','잘지내다'],['get over','극복하다'],['get rid of','없애다'],
    ['give up','포기하다'],['go ahead','진행하다'],['grow up','자라다'],['hand in','제출하다'],['hang out','어울리다'],['hold on','기다리다'],['keep up','유지하다'],['let down','실망시키다'],['look after','돌보다'],['look forward to','기대하다'],
    ['look up','찾아보다'],['make up','화해하다'],['move on','넘어가다'],['pick up','줍다'],['point out','지적하다'],['put off','연기하다'],['put on','입다'],['run out of','다쓰다'],['set up','설치하다'],['show up','나타나다']
  ],
  advancedVerbs6: [
    ['abandon','버리다'],['abolish','폐지하다'],['accelerate','가속하다'],['accommodate','수용하다'],['accumulate','축적하다'],['acknowledge','인정하다'],['activate','활성화하다'],['administer','관리하다'],['advocate','옹호하다'],['allocate','배분하다'],
    ['alter','변경하다'],['amend','수정하다'],['anticipate','예상하다'],['appeal','호소하다'],['appoint','임명하다'],['assign','배정하다'],['authorize','권한부여하다'],['ban','금지하다'],['broaden','넓히다'],['categorize','분류하다'],
    ['cease','중단하다'],['certify','인증하다'],['characterize','특징짓다'],['circulate','순환하다'],['cite','인용하다'],['clarify','명확히하다'],['coincide','일치하다'],['collaborate','협력하다'],['commence','시작하다'],['compensate','보상하다'],
    ['compile','편집하다'],['comply','준수하다'],['comprise','구성하다'],['conceive','생각해내다'],['confine','제한하다'],['confront','맞서다'],['consolidate','통합하다'],['constitute','구성하다'],['constrain','제약하다'],['contemplate','숙고하다'],
    ['contradict','모순되다'],['convert','전환하다'],['cultivate','재배하다'],['deceive','속이다'],['dedicate','헌신하다'],['delegate','위임하다'],['deliberate','숙고하다'],['demolish','철거하다'],['depict','묘사하다'],['deploy','배치하다'],
    ['derive','유래하다'],['designate','지정하다'],['deteriorate','악화하다'],['devise','고안하다'],['differentiate','구별하다'],['diminish','줄이다'],['disclose','공개하다'],['discriminate','차별하다'],['displace','대체하다'],['dispose','처리하다']
  ]
};

const exampleSentences = {
  noun: (w) => `I can see a ${w}.`,
  verb: (w) => `I like to ${w}.`,
  adjective: (w) => `It is very ${w}.`,
  adverb: (w) => `She speaks ${w}.`,
  number: (w) => `There are ${w} apples.`,
  default: (w) => `This is ${w}.`
};

const exampleKorean = {
  noun: (k) => `나는 ${k}을(를) 볼 수 있어요.`,
  verb: (k) => `나는 ${k}을(를) 좋아해요.`,
  adjective: (k) => `그것은 매우 ${k}(이)에요.`,
  adverb: (k) => `그녀는 ${k} 말해요.`,
  number: (k) => `사과가 ${k}개 있어요.`,
  default: (k) => `이것은 ${k}이에요.`
};

function getPOS(category) {
  const posMap = {
    animals: 'noun', fruits: 'noun', vegetables: 'noun', colors: 'noun',
    numbers: 'noun', family: 'noun', body: 'noun', school: 'noun',
    food: 'noun', weather: 'noun', places: 'noun', clothes: 'noun',
    feelings: 'adjective', verbs: 'verb', adverbs: 'adverb', time: 'noun',
    jobs: 'noun', transportation: 'noun', science: 'noun', sports: 'noun',
    emotions: 'adjective', comparatives: 'adjective', advancedVerbs: 'verb',
    grammar: 'adverb', environment: 'noun', history: 'noun', technology: 'noun',
    health: 'noun', advancedNouns: 'noun', academic: 'noun', abstractNouns: 'noun',
    connectors: 'adverb', phrasalVerbs: 'verb', advancedVerbs6: 'verb'
  };
  return posMap[category] || 'noun';
}

function generateWordData(rawData, grade, gradePrefix) {
  const words = [];
  let counter = 1;

  for (const [category, wordList] of Object.entries(rawData)) {
    const pos = getPOS(category);
    for (const [eng, kor] of wordList) {
      const id = `${gradePrefix}_${String(counter).padStart(3, '0')}`;
      const difficulty = grade === 3 ? Math.min(Math.ceil(counter / (wordList.length / 3)), 3) :
                         grade === 4 ? Math.min(Math.ceil(counter / (wordList.length / 3)), 4) :
                         Math.min(2 + Math.ceil(counter / (wordList.length / 3)), 5);

      const sentenceFn = exampleSentences[pos] || exampleSentences.default;
      const koreanFn = exampleKorean[pos] || exampleKorean.default;

      words.push({
        id,
        english: eng,
        korean: kor,
        grade,
        category: category.replace(/([A-Z])/g, ' $1').trim().toLowerCase(),
        difficulty: Math.min(difficulty, 5),
        phonetic: '',
        partOfSpeech: pos,
        exampleSentence: sentenceFn(eng),
        exampleKorean: koreanFn(kor),
        synonyms: [],
        antonyms: [],
        relatedWords: []
      });
      counter++;
    }
  }
  return words;
}

function writeGradeFile(grade, words, filePath) {
  let content = `import { WordData } from '@/shared/types/game';\n\nexport const grade${grade}Words: WordData[] = [\n`;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    content += `  {\n`;
    content += `    id: '${w.id}',\n`;
    content += `    english: '${w.english.replace(/'/g, "\\'")}',\n`;
    content += `    korean: '${w.korean.replace(/'/g, "\\'")}',\n`;
    content += `    grade: ${w.grade} as const,\n`;
    content += `    category: '${w.category}',\n`;
    content += `    difficulty: ${w.difficulty} as 1 | 2 | 3 | 4 | 5,\n`;
    content += `    phonetic: '${w.phonetic}',\n`;
    content += `    partOfSpeech: '${w.partOfSpeech}',\n`;
    content += `    exampleSentence: '${w.exampleSentence.replace(/'/g, "\\'")}',\n`;
    content += `    exampleKorean: '${w.exampleKorean.replace(/'/g, "\\'")}',\n`;
    content += `    synonyms: [${w.synonyms.map(s => `'${s}'`).join(', ')}],\n`;
    content += `    antonyms: [${w.antonyms.map(s => `'${s}'`).join(', ')}],\n`;
    content += `    relatedWords: [${w.relatedWords.map(s => `'${s}'`).join(', ')}],\n`;
    content += `  }${i < words.length - 1 ? ',' : ''}\n`;
  }

  content += `];\n`;
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Grade ${grade}: ${words.length} words -> ${filePath}`);
}

const outDir = path.join(__dirname, '..', 'src', 'shared', 'constants', 'words');

const g3Words = generateWordData(g3Raw, 3, 'g3');
const g4Words = generateWordData(g4Raw, 4, 'g4');
const g5Words = generateWordData(g5Raw, 5, 'g5');
const g6Words = generateWordData(g6Raw, 6, 'g6');

writeGradeFile(3, g3Words, path.join(outDir, 'grade3.ts'));
writeGradeFile(4, g4Words, path.join(outDir, 'grade4.ts'));
writeGradeFile(5, g5Words, path.join(outDir, 'grade5.ts'));
writeGradeFile(6, g6Words, path.join(outDir, 'grade6.ts'));

console.log(`\nTotal: ${g3Words.length + g4Words.length + g5Words.length + g6Words.length} words`);
