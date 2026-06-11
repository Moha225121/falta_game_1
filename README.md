# فلتة

لعبة جماعية للأسئلة والخداع. اللاعبون يدخلون غرفة، يكتبون إجابات صحيحة أو مزيفة، يصوتون بدون كشف الأسماء، ويحصلون على نقاط عند اختيار الحقيقة أو خداع الآخرين.

## التقنية

- الخادم: Node.js و Express و Socket.IO.
- البيانات: أسئلة محفوظة في ملف JSON داخل `server/data/questions.json`، وتصنيفات الإدارة داخل `server/data/categories.json`.
- الواجهة: React و Vite مع تصميم متجاوب للاعبين.
- الإدارة: لوحة مستقلة على `/admin-panel` لإدارة الأسئلة والتصنيفات والإحصائيات، محمية بالمتغير `ADMIN_TOKEN`.

## التشغيل المحلي

```bash
npm install
npm run dev
```

واجهة الويب تعمل على `http://localhost:5173`، وتحوّل طلبات API و Socket إلى `http://localhost:4000`.

## اختبار سريع بلا لاعبين

1. افتح `http://localhost:5173`.
2. أنشئ غرفة.
3. اختر طور اللعبة.
4. في طور فلتة، اختر أي عدد من بطاقات أنواع الأسئلة. ترك خيار كل الأنواع مفعلا يعني استخدام كل التصنيفات النشطة.
5. في غرفة الانتظار، اضغط إضافة لاعب آلي مرتين.
6. ابدأ اللعبة.
7. أرسل إجابتك أو صوت عندما يطلب منك الطور ذلك.

اللاعبون الآليون يُحسبون ضمن الحد الأدنى للاعبين، ويرسلون الإجابات والأصوات تلقائيا لتسهيل الاختبار المحلي.

لتشغيل نسخة الإنتاج من خلال خادم API:

```bash
npm run build
npm start
```

بعدها افتح `http://localhost:4000`.

## البيئة

انسخ `.env.example` إلى `.env` وعدّل القيم حسب الحاجة.

```bash
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
ADMIN_TOKEN=change-this-secret
MIN_PLAYERS=3
MAX_PLAYERS=6
ANSWER_SECONDS=30
VOTE_SECONDS=30
```

لوحة الإدارة غير ظاهرة من واجهة اللاعب. افتحها مباشرة من `/admin-panel`.

كل واجهات إدارة الأسئلة والتصنيفات والإحصائيات تحتاج هذا الترويس:

```http
Authorization: Bearer your-token
```

## واجهات REST

- `GET /api/health`
- `GET /api/config`
- `GET /api/categories`
- `GET /api/game-modes`
- `GET /api/question-types`
- `GET /api/stats` يتطلب رمز الإدارة
- `GET /api/category-records` يتطلب رمز الإدارة
- `POST /api/category-records` يتطلب رمز الإدارة
- `GET /api/questions` يتطلب رمز الإدارة
- `GET /api/questions/:id` يتطلب رمز الإدارة
- `POST /api/questions` يتطلب رمز الإدارة
- `POST /api/questions/import` يتطلب رمز الإدارة
- `PUT /api/questions/:id` يتطلب رمز الإدارة
- `DELETE /api/questions/:id` يتطلب رمز الإدارة
- `GET /api/rooms/:code`

## أشكال إدخال الأسئلة

الأسئلة مرتبطة بالطور. التصنيفات مرتبطة بالطور أيضا، لذلك تصنيف الطعام في طور الدخيل مختلف عن تصنيف الطعام في طور فلتة.

أنشئ سجل تصنيف أولا إذا كنت تريد ظهوره في قائمة الإدارة قبل إضافة أسئلة له:

```http
POST /api/category-records
Authorization: Bearer your-token
Content-Type: application/json
```

```json
{
  "mode": "imposter",
  "category": "أكل",
  "active": true
}
```

كل سؤال يحتوي على حقول مشتركة:

```json
{
  "mode": "kalak",
  "category": "ليبيا",
  "difficulty": "medium",
  "source": "الإدارة",
  "tags": ["محلي"],
  "active": true
}
```

حقول طور فلتة:

```json
{
  "mode": "kalak",
  "category": "ليبيا",
  "prompt": "ما هي عاصمة ليبيا؟",
  "correctAnswer": "طرابلس"
}
```

حقول طور الدخيل:

```json
{
  "mode": "imposter",
  "category": "أكل",
  "secretWord": "بازين",
  "prompt": "اكتب وصفا من كلمة واحدة للكلمة السرية."
}
```

حقول طور كذبة ذكية:

```json
{
  "mode": "fake_fact",
  "category": "علوم",
  "statement": "الأخطبوط لديه ثلاثة قلوب.",
  "answer": "true",
  "explanation": "قلبان يضخان الدم إلى الخياشيم، وقلب واحد إلى باقي الجسم."
}
```

حقول طور كشف الذكاء:

```json
{
  "mode": "spot_ai",
  "category": "كشف الذكاء",
  "prompt": "اكتب عذرا مصقولا بشكل مريب للتأخر.",
  "aiAnswer": "تأخرت بسبب ظروف غير متوقعة، وأقدر تفهمكم."
}
```

حقول طور الحكم:

```json
{
  "mode": "judge_pick",
  "category": "الحكم",
  "prompt": "اكتب عذرا يجعل الحكم يضحك.",
  "gameAnswers": [
    "المنبه قدم استقالته في الليل.",
    "الزحمة دخلت معي في مفاوضات."
  ]
}
```

الاستيراد الجماعي يقبل مصفوفة مباشرة أو الشكل `{ "questions": [...] }`:

```http
POST /api/questions/import
Authorization: Bearer your-token
Content-Type: application/json
```

## أحداث Socket

الأحداث التي يرسلها العميل:

- `room:create`
- `room:join`
- `room:updateSettings`
- `room:addBot`
- `room:removeBot`
- `game:start`
- `game:end`
- `answer:submit`
- `vote:submit`
- `round:next`
- `chat:send`

الأحداث التي يرسلها الخادم:

- `room:state`
- `game:error`

## النقاط

- التصويت للإجابة الصحيحة: `+100`
- لاعب آخر يصوت لإجابتك المزيفة: `+50`
- إرسال الإجابة الصحيحة حرفيا أثناء مرحلة الإجابة: `+150`

الأطوار الحالية المدارة من لوحة الإدارة هي: فلتة، الدخيل، كذبة ذكية، كشف الذكاء، والحكم.
