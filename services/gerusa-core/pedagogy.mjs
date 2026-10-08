const TASK_TYPES = new Set([
  "writing",
  "reading",
  "vocabulary",
  "grammar",
  "sentences",
  "questions",
  "quiz",
  "story_continuation",
  "character_diary",
]);
const LESSON_STATUSES = new Set(["draft", "planned", "completed", "cancelled"]);
const RECORD_TYPES = new Set([
  "success",
  "difficulty",
  "new_vocabulary",
  "recurring_error",
  "observation",
  "narrative",
  "task_suggestion",
  "progress",
]);
const PROGRESS_STATUSES = new Set(["emerging", "developing", "secure", "not_observed"]);

function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}

function text(value, max = 4000) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function optionalUuid(value) {
  if (value == null || value === "") return null;
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
    fail("invalid_id");
  return value;
}

function jsonArray(value, limit = 60) {
  return Array.isArray(value) ? value.slice(0, limit) : [];
}

function jsonObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function masterForMesa(pool, userId, mesaId) {
  const result = await pool.query(
    `SELECT 1 FROM gerusa.mesa_members
      WHERE user_id=$1 AND mesa_id=$2 AND member_role='mestre' AND membership_status='active'
      LIMIT 1`,
    [userId, mesaId],
  );
  return Boolean(result.rowCount);
}

async function studentForMesa(pool, userId, mesaId) {
  const result = await pool.query(
    `SELECT 1 FROM gerusa.mesa_members
      WHERE user_id=$1 AND mesa_id=$2 AND member_role='jogador' AND membership_status='active'
      LIMIT 1`,
    [userId, mesaId],
  );
  return Boolean(result.rowCount);
}

async function authorizeTeacherContext(pool, userId, mesaId, studentId = null) {
  if (!mesaId || !(await masterForMesa(pool, userId, mesaId))) fail("mesa_forbidden", 403);
  if (studentId && !(await studentForMesa(pool, studentId, mesaId))) fail("student_forbidden", 404);
}

async function authorizeOwnContext(pool, userId, mesaId = null) {
  if (mesaId) {
    if (!(await studentForMesa(pool, userId, mesaId))) fail("mesa_forbidden", 404);
    return mesaId;
  }
  const result = await pool.query(
    `SELECT mesa_id::text AS id FROM gerusa.mesa_members
      WHERE user_id=$1 AND member_role='jogador' AND membership_status='active'
      ORDER BY joined_at, mesa_id LIMIT 1`,
    [userId],
  );
  if (!result.rowCount) fail("active_student_mesa_required", 409);
  return result.rows[0].id;
}

async function validateCampaign(pool, mesaId, campaignId) {
  if (!campaignId) return;
  const result = await pool.query(
    "SELECT 1 FROM gerusa.campaigns WHERE id=$1 AND mesa_id=$2 AND status='active'",
    [campaignId, mesaId],
  );
  if (!result.rowCount) fail("campaign_not_found", 404);
}

async function saveCampaign(pool, user, body) {
  const mesaId = optionalUuid(body.mesaId);
  const studentId = optionalUuid(body.studentId);
  if (!studentId) fail("student_required");
  await authorizeTeacherContext(pool, user.id, mesaId, studentId);
  const name = text(body.name, 120);
  if (!name) fail("campaign_name_required");
  if (body.status != null && !["active", "archived"].includes(body.status))
    fail("invalid_campaign_status");
  const status = body.status === "archived" ? "archived" : "active";
  const result = await pool.query(
    `INSERT INTO gerusa.campaigns (mesa_id,name,premise,status)
     VALUES ($1,$2,$3,$4)
     RETURNING id::text AS id,mesa_id::text AS "mesaId",name,premise,status,
       created_at AS "createdAt"`,
    [mesaId, name, text(body.premise, 4000), status],
  );
  return { campaign: result.rows[0] };
}

async function getTeacherView(pool, user, params) {
  const mesaId = optionalUuid(params.get("mesaId"));
  const studentId = optionalUuid(params.get("studentId"));
  await authorizeTeacherContext(pool, user.id, mesaId, studentId);
  const [students, lessons, adventures, assignments, sessions, records, characters] =
    await Promise.all([
      pool.query(
        `SELECT u.id::text AS id, p.display_name AS name, m.id::text AS "mesaId", m.name AS "mesaName"
         FROM gerusa.mesa_members teacher
         JOIN gerusa.mesa_members member ON member.mesa_id=teacher.mesa_id
           AND member.member_role='jogador' AND member.membership_status='active'
         JOIN gerusa.users u ON u.id=member.user_id AND u.status='active'
         JOIN gerusa.profiles p ON p.id=u.id
         JOIN gerusa.mesas m ON m.id=member.mesa_id
        WHERE teacher.user_id=$1 AND teacher.mesa_id=$2 AND teacher.member_role='mestre'
          AND teacher.membership_status='active' AND ($3::uuid IS NULL OR u.id=$3)
        ORDER BY p.display_name`,
        [user.id, mesaId, studentId],
      ),
      pool.query(
        `SELECT l.id::text AS id,l.student_id::text AS "studentId",p.display_name AS "studentName",
              l.mesa_id::text AS "mesaId",l.campaign_id::text AS "campaignId",c.name AS "campaignName",
              l.adventure_id::text AS "adventureId",l.assignment_id::text AS "assignmentId",l.title,
              l.scheduled_at AS "scheduledAt",l.status,l.objective,l.grammar,l.vocabulary,
              l.duration_minutes AS "durationMinutes",l.outline,l.notes,
              l.created_at AS "createdAt",l.updated_at AS "updatedAt"
         FROM gerusa.lessons l JOIN gerusa.profiles p ON p.id=l.student_id
         LEFT JOIN gerusa.campaigns c ON c.id=l.campaign_id
        WHERE l.mesa_id=$1 AND ($2::uuid IS NULL OR l.student_id=$2)
        ORDER BY l.scheduled_at DESC NULLS LAST,l.updated_at DESC LIMIT 100`,
        [mesaId, studentId],
      ),
      pool.query(
        `SELECT a.* FROM (
         SELECT adventure.id::text,adventure.student_id::text AS "studentId",adventure.mesa_id::text AS "mesaId",
                adventure.campaign_id::text AS "campaignId",campaign.name AS "campaignName",adventure.title,
                adventure.premise,adventure.pedagogical_objective AS "pedagogicalObjective",
                adventure.grammar_target AS "grammarTarget",adventure.vocabulary,
                adventure.estimated_minutes AS "estimatedMinutes",adventure.tone,
                adventure.difficulty,adventure.scenes,adventure.npcs,adventure.choices,adventure.challenges,
                adventure.english_questions AS "englishQuestions",adventure.supports,
                adventure.conclusion,adventure.hook,adventure.suggested_task AS "suggestedTask",
                adventure.status,adventure.created_at AS "createdAt",adventure.updated_at AS "updatedAt"
           FROM gerusa.adventures adventure
           LEFT JOIN gerusa.campaigns campaign ON campaign.id=adventure.campaign_id
          WHERE adventure.mesa_id=$1 AND ($2::uuid IS NULL OR adventure.student_id=$2)
        ) a ORDER BY a."updatedAt" DESC LIMIT 100`,
        [mesaId, studentId],
      ),
      pool.query(
        `SELECT a.id::text AS id,a.student_id::text AS "studentId",p.display_name AS "studentName",
              a.mesa_id::text AS "mesaId",a.campaign_id::text AS "campaignId",c.name AS "campaignName",
              a.lesson_id::text AS "lessonId",a.live_session_id::text AS "liveSessionId",
              a.adventure_id::text AS "adventureId",a.task_type AS "taskType",a.title,a.prompt,a.content,
              a.status,a.due_at AS "dueAt",a.allow_resubmit AS "allowResubmit",a.student_response AS "studentResponse",
              a.submitted_at AS "submittedAt",a.teacher_feedback AS "teacherFeedback",a.reviewed_at AS "reviewedAt",
              a.created_at AS "createdAt",a.updated_at AS "updatedAt"
         FROM gerusa.assignments a JOIN gerusa.profiles p ON p.id=a.student_id
         LEFT JOIN gerusa.campaigns c ON c.id=a.campaign_id
        WHERE a.mesa_id=$1 AND ($2::uuid IS NULL OR a.student_id=$2)
        ORDER BY a.due_at NULLS LAST,a.updated_at DESC LIMIT 100`,
        [mesaId, studentId],
      ),
      pool.query(
        `SELECT s.id::text AS id,s.lesson_id::text AS "lessonId",s.student_id::text AS "studentId",
              p.display_name AS "studentName",s.mesa_id::text AS "mesaId",l.campaign_id::text AS "campaignId",
              c.name AS "campaignName",ch.name AS "characterName",ad.title AS "adventureTitle",
              s.adventure_id::text AS "adventureId",
              s.status,s.current_scene_index AS "currentSceneIndex",s.quick_notes AS "quickNotes",s.summary,
              s.started_at AS "startedAt",s.ended_at AS "endedAt",s.updated_at AS "updatedAt"
         FROM gerusa.live_sessions s JOIN gerusa.profiles p ON p.id=s.student_id
         JOIN gerusa.lessons l ON l.id=s.lesson_id
         LEFT JOIN gerusa.campaigns c ON c.id=l.campaign_id
         LEFT JOIN gerusa.characters ch ON ch.owner_user_id=s.student_id AND ch.mesa_id=s.mesa_id
         LEFT JOIN gerusa.adventures ad ON ad.id=s.adventure_id
        WHERE s.mesa_id=$1 AND ($2::uuid IS NULL OR s.student_id=$2)
        ORDER BY s.started_at DESC LIMIT 50`,
        [mesaId, studentId],
      ),
      pool.query(
        `SELECT r.id::text AS id,r.student_id::text AS "studentId",p.display_name AS "studentName",
              r.mesa_id::text AS "mesaId",r.lesson_id::text AS "lessonId",r.live_session_id::text AS "liveSessionId",
              r.record_type AS "recordType",r.skill,r.progress_status AS "progressStatus",r.observation,
              r.evidence,r.confirmed,r.created_at AS "createdAt"
         FROM gerusa.lesson_records r JOIN gerusa.profiles p ON p.id=r.student_id
        WHERE r.mesa_id=$1 AND ($2::uuid IS NULL OR r.student_id=$2)
        ORDER BY r.created_at DESC LIMIT 100`,
        [mesaId, studentId],
      ),
      pool.query(
        `SELECT id::text AS id,owner_user_id::text AS "ownerUserId",mesa_id::text AS "mesaId",
              campaign_id::text AS "campaignId",name,sheet,updated_at AS "updatedAt"
         FROM gerusa.characters WHERE mesa_id=$1 AND ($2::uuid IS NULL OR owner_user_id=$2)
        ORDER BY updated_at DESC`,
        [mesaId, studentId],
      ),
    ]);
  const mesa = user.mesas.find((item) => item.id === mesaId);
  const campaigns = await pool.query(
    `SELECT id::text AS id,name,premise,status,created_at AS "createdAt"
       FROM gerusa.campaigns WHERE mesa_id=$1 ORDER BY created_at DESC,id`,
    [mesaId],
  );
  return {
    view: "teacher",
    mesa: mesa ? { ...mesa, campaigns: campaigns.rows } : null,
    students: students.rows,
    lessons: lessons.rows,
    adventures: adventures.rows,
    assignments: assignments.rows,
    sessions: sessions.rows,
    records: records.rows,
    characters: characters.rows,
  };
}

async function getStudentView(pool, user, params) {
  const requestedStudentId = optionalUuid(params.get("studentId"));
  if (requestedStudentId && requestedStudentId.toLowerCase() !== user.id.toLowerCase())
    fail("student_not_found", 404);
  const mesaId = await authorizeOwnContext(pool, user.id, optionalUuid(params.get("mesaId")));
  const campaign = await pool.query(
    `SELECT m.id::text AS id,m.name AS "mesaName",c.id::text AS "campaignId",
            c.name AS "campaignName",c.premise AS "campaignPremise"
       FROM gerusa.mesas m JOIN gerusa.mesa_members mm ON mm.mesa_id=m.id
       LEFT JOIN gerusa.campaigns c ON c.id=(
         SELECT ch.campaign_id FROM gerusa.characters ch
           JOIN gerusa.campaigns active_character_campaign ON active_character_campaign.id=ch.campaign_id
             AND active_character_campaign.status='active'
           WHERE ch.owner_user_id=$2 AND ch.mesa_id=m.id LIMIT 1
       ) AND c.status='active'
      WHERE m.id=$1 AND mm.user_id=$2 AND mm.member_role='jogador' AND mm.membership_status='active'
      LIMIT 1`,
    [mesaId, user.id],
  );
  if (!campaign.rowCount) fail("mesa_not_found", 404);
  const [character, lessons, adventures, assignments, sessions, records, conversations] =
    await Promise.all([
      pool.query(
        `SELECT id::text AS id,campaign_id::text AS "campaignId",name,sheet,updated_at AS "updatedAt" FROM gerusa.characters
        WHERE owner_user_id=$1 AND mesa_id=$2 LIMIT 1`,
        [user.id, mesaId],
      ),
      pool.query(
        `SELECT l.id::text AS id,l.title,l.scheduled_at AS "scheduledAt",l.status,l.objective,l.grammar,l.vocabulary,
              l.campaign_id::text AS "campaignId",campaign.name AS "campaignName",
              l.duration_minutes AS "durationMinutes",l.outline,l.notes,l.adventure_id::text AS "adventureId"
         FROM gerusa.lessons l LEFT JOIN gerusa.campaigns campaign ON campaign.id=l.campaign_id
        WHERE l.student_id=$1 AND l.mesa_id=$2 AND l.status<>'cancelled'
          AND ($3::uuid IS NULL OR l.campaign_id=$3)
        ORDER BY l.scheduled_at DESC NULLS LAST,l.updated_at DESC LIMIT 20`,
        [user.id, mesaId, campaign.rows[0].campaignId],
      ),
      pool.query(
        `SELECT id::text AS id,campaign_id::text AS "campaignId",title,premise,pedagogical_objective AS "pedagogicalObjective",
              grammar_target AS "grammarTarget",vocabulary,estimated_minutes AS "estimatedMinutes",tone,difficulty,
              scenes,npcs,choices,challenges,english_questions AS "englishQuestions",supports,conclusion,hook,suggested_task AS "suggestedTask"
         FROM gerusa.adventures WHERE student_id=$1 AND mesa_id=$2 AND status='active'
           AND ($3::uuid IS NULL OR campaign_id=$3)
        ORDER BY updated_at DESC LIMIT 20`,
        [user.id, mesaId, campaign.rows[0].campaignId],
      ),
      pool.query(
        `SELECT id::text AS id,campaign_id::text AS "campaignId",lesson_id::text AS "lessonId",
              live_session_id::text AS "liveSessionId",task_type AS "taskType",title,prompt,content,status,due_at AS "dueAt",
              allow_resubmit AS "allowResubmit",student_response AS "studentResponse",submitted_at AS "submittedAt",
              teacher_feedback AS "teacherFeedback",reviewed_at AS "reviewedAt",created_at AS "createdAt"
         FROM gerusa.assignments WHERE student_id=$1 AND mesa_id=$2 AND status IN ('published','submitted','reviewed')
           AND ($3::uuid IS NULL OR campaign_id=$3)
        ORDER BY due_at NULLS LAST,created_at DESC LIMIT 50`,
        [user.id, mesaId, campaign.rows[0].campaignId],
      ),
      pool.query(
        `SELECT s.id::text AS id,s.status,s.summary,s.started_at AS "startedAt",s.ended_at AS "endedAt",
              l.title AS "lessonTitle",l.campaign_id::text AS "campaignId",c.name AS "campaignName",
              ch.name AS "characterName",ad.title AS "adventureTitle",l.objective,l.grammar,l.vocabulary
         FROM gerusa.live_sessions s JOIN gerusa.lessons l ON l.id=s.lesson_id
         LEFT JOIN gerusa.campaigns c ON c.id=l.campaign_id
         LEFT JOIN gerusa.characters ch ON ch.owner_user_id=s.student_id AND ch.mesa_id=s.mesa_id
         LEFT JOIN gerusa.adventures ad ON ad.id=s.adventure_id
        WHERE s.student_id=$1 AND s.mesa_id=$2 AND ($3::uuid IS NULL OR l.campaign_id=$3)
        ORDER BY s.started_at DESC LIMIT 10`,
        [user.id, mesaId, campaign.rows[0].campaignId],
      ),
      pool.query(
        `SELECT r.id::text AS id,r.record_type AS "recordType",r.skill,
              r.progress_status AS "progressStatus",r.observation,r.confirmed,r.created_at AS "createdAt"
         FROM gerusa.lesson_records r JOIN gerusa.lessons l ON l.id=r.lesson_id
        WHERE r.student_id=$1 AND r.mesa_id=$2 AND r.confirmed=true
          AND ($3::uuid IS NULL OR l.campaign_id=$3)
        ORDER BY r.created_at DESC LIMIT 50`,
        [user.id, mesaId, campaign.rows[0].campaignId],
      ),
      pool.query(
        `SELECT id::text AS id,updated_at AS "updatedAt" FROM gerusa.conversations
        WHERE user_id=$1 AND mesa_id=$2 ORDER BY updated_at DESC LIMIT 1`,
        [user.id, mesaId],
      ),
    ]);
  const entries = lessons.rows;
  const now = Date.now();
  const nextLesson =
    entries.find(
      (item) =>
        item.status === "planned" &&
        item.scheduledAt &&
        new Date(item.scheduledAt).getTime() >= now,
    ) ??
    entries.find((item) => item.status === "planned") ??
    null;
  return {
    view: "student",
    profile: { id: user.id, name: user.displayName, pronouns: user.pronouns },
    context: campaign.rows[0],
    character: character.rows[0] ?? null,
    nextLesson,
    lessons: entries,
    adventures: adventures.rows,
    assignments: assignments.rows,
    sessions: sessions.rows,
    records: records.rows,
    threadId: conversations.rows[0]?.id ?? null,
  };
}

export async function getPedagogyView(pool, user, params) {
  const view = params.get("view") || "teacher";
  if (view === "student") return getStudentView(pool, user, params);
  if (view === "teacher" || view === "library" || view === "context")
    return getTeacherView(pool, user, params);
  fail("invalid_view");
}

async function getAssignmentReviewContext(pool, user, mesaId, studentId, assignmentId) {
  await authorizeTeacherContext(pool, user.id, mesaId, studentId);
  const assignment = await pool.query(
    `SELECT a.id::text AS id,a.task_type AS "taskType",a.title,a.prompt,a.content,
            a.student_response AS response,a.teacher_feedback AS "teacherFeedback",a.status,
            a.campaign_id::text AS "campaignId",a.lesson_id::text AS "lessonId",
            a.live_session_id::text AS "liveSessionId",a.adventure_id::text AS "adventureId",
            p.display_name AS "studentName",p.age_years AS "studentAge",
            campaign.id::text AS "linkedCampaignId",campaign.name AS "campaignName",
            campaign.premise AS "campaignPremise",
            ch.name AS "characterName",
            lesson.id::text AS "linkedLessonId",lesson.title AS "lessonTitle",lesson.objective AS "lessonObjective",
            lesson.grammar AS "lessonGrammar",lesson.vocabulary AS "lessonVocabulary",
            adventure.id::text AS "linkedAdventureId",adventure.title AS "adventureTitle",
            adventure.premise AS "adventurePremise",
            live_session.id::text AS "linkedSessionId",live_session.started_at AS "sessionStartedAt",
            live_session.ended_at AS "sessionEndedAt",live_session.summary AS "sessionSummary"
       FROM gerusa.assignments a
       JOIN gerusa.profiles p ON p.id=a.student_id
       LEFT JOIN gerusa.campaigns campaign ON campaign.id=a.campaign_id AND campaign.mesa_id=a.mesa_id
       LEFT JOIN gerusa.characters ch ON ch.owner_user_id=a.student_id
         AND ch.mesa_id=a.mesa_id AND ch.campaign_id=a.campaign_id
       LEFT JOIN gerusa.lessons lesson ON lesson.id=a.lesson_id
         AND lesson.student_id=a.student_id AND lesson.mesa_id=a.mesa_id
         AND lesson.campaign_id IS NOT DISTINCT FROM a.campaign_id
       LEFT JOIN gerusa.adventures adventure ON adventure.id=a.adventure_id
         AND adventure.student_id=a.student_id AND adventure.mesa_id=a.mesa_id
         AND adventure.campaign_id IS NOT DISTINCT FROM a.campaign_id
       LEFT JOIN gerusa.live_sessions live_session ON live_session.id=a.live_session_id
         AND live_session.lesson_id=a.lesson_id AND live_session.student_id=a.student_id
         AND live_session.mesa_id=a.mesa_id
         AND live_session.adventure_id IS NOT DISTINCT FROM a.adventure_id
      WHERE a.id=$1 AND a.student_id=$2 AND a.mesa_id=$3 AND a.status='submitted'
      LIMIT 1`,
    [assignmentId, studentId, mesaId],
  );
  if (!assignment.rowCount || !assignment.rows[0].response) fail("submission_not_available", 404);
  const item = assignment.rows[0];
  if (
    (item.campaignId && !item.linkedCampaignId) ||
    (item.lessonId && !item.linkedLessonId) ||
    (item.adventureId && !item.linkedAdventureId)
  )
    fail("submission_context_unavailable", 409);
  if (item.liveSessionId && !item.linkedSessionId) fail("submission_context_unavailable", 409);
  const content = jsonObject(item.content);
  const campaignId = item.campaignId;
  const progress = await pool.query(
    `SELECT r.skill,r.progress_status AS status,r.observation,r.evidence
       FROM gerusa.lesson_records r
       JOIN gerusa.lessons l ON l.id=r.lesson_id AND l.student_id=r.student_id AND l.mesa_id=r.mesa_id
      WHERE r.student_id=$1 AND r.mesa_id=$2 AND r.confirmed=true
        AND (($3::uuid IS NOT NULL AND l.campaign_id=$3)
          OR ($3::uuid IS NULL AND $4::uuid IS NOT NULL AND l.id=$4))
      ORDER BY r.created_at DESC LIMIT 8`,
    [studentId, mesaId, campaignId, item.lessonId],
  );
  const sessionSummary = jsonObject(item.sessionSummary);
  const summaryKeys = [
    "narrativeSummary",
    "pedagogicalSummary",
    "grammar",
    "vocabulary",
    "strengths",
    "difficulties",
    "nextStep",
  ];
  const session = item.linkedSessionId
    ? {
        startedAt: item.sessionStartedAt,
        endedAt: item.sessionEndedAt,
        summary: Object.fromEntries(
          summaryKeys.flatMap((key) => {
            const value = sessionSummary[key];
            if (typeof value === "string") return [[key, text(value, 1200)]];
            if (Array.isArray(value))
              return [[key, jsonArray(value, 12).map((part) => text(part, 240))]];
            return [];
          }),
        ),
      }
    : null;
  return {
    student: {
      name: text(item.studentName, 100),
      ...(Number.isInteger(item.studentAge) ? { age: item.studentAge } : {}),
    },
    task: {
      id: item.id,
      type: item.taskType,
      title: text(item.title, 160),
      instructions: text(item.prompt, 4000),
      details: {
        steps: jsonArray(content.instructions, 12).map((part) => text(part, 400)),
        expectedEvidence: text(content.expectedEvidence, 1200),
        grammarTarget: text(content.grammarTarget || item.lessonGrammar, 1000),
        vocabularyTarget: jsonArray(content.vocabulary, 20).length
          ? jsonArray(content.vocabulary, 20).map((part) => text(part, 120))
          : text(item.lessonVocabulary, 1000),
      },
      response: text(item.response, 12000),
      existingTeacherFeedback: text(item.teacherFeedback, 2000),
    },
    lesson: item.linkedLessonId
      ? {
          title: text(item.lessonTitle, 160),
          objective: text(item.lessonObjective, 1200),
        }
      : null,
    character: item.characterName ? { name: text(item.characterName, 100) } : null,
    campaign: item.linkedCampaignId
      ? {
          name: text(item.campaignName, 120),
          premise: text(item.campaignPremise, 1600),
        }
      : null,
    adventure: item.linkedAdventureId
      ? {
          title: text(item.adventureTitle, 160),
          premise: text(item.adventurePremise, 1600),
        }
      : null,
    session,
    relevantProgress: progress.rows.map((record) => ({
      skill: text(record.skill, 100),
      status: record.status,
      observation: text(record.observation, 400),
      evidence: text(record.evidence, 400),
    })),
  };
}

export async function getPedagogyAiContext(pool, user, params) {
  const mesaId = optionalUuid(params.get("mesaId"));
  const studentId = optionalUuid(params.get("studentId"));
  const lessonId = optionalUuid(params.get("lessonId"));
  const campaignId = optionalUuid(params.get("campaignId"));
  const assignmentId = optionalUuid(params.get("assignmentId"));
  if (!studentId) fail("student_required");
  if (assignmentId) {
    return getAssignmentReviewContext(pool, user, mesaId, studentId, assignmentId);
  }
  await authorizeTeacherContext(pool, user.id, mesaId, studentId);
  await validateCampaign(pool, mesaId, campaignId);
  const [
    profile,
    membership,
    character,
    lessons,
    sessions,
    records,
    assignments,
    lesson,
    adventure,
  ] = await Promise.all([
    pool.query(
      `SELECT display_name AS name,pronouns,age_years AS age FROM gerusa.profiles WHERE id=$1`,
      [studentId],
    ),
    pool.query(
      `SELECT m.name AS "mesaName",c.id::text AS "campaignId",c.name AS "campaignName",c.premise AS "campaignPremise"
       FROM gerusa.mesa_members mm JOIN gerusa.mesas m ON m.id=mm.mesa_id
       LEFT JOIN gerusa.campaigns c ON c.mesa_id=m.id AND c.status='active' AND c.id=COALESCE(
         $3::uuid,
         (SELECT ch.campaign_id FROM gerusa.characters ch
           JOIN gerusa.campaigns active_character_campaign ON active_character_campaign.id=ch.campaign_id
             AND active_character_campaign.status='active'
           WHERE ch.owner_user_id=$1 AND ch.mesa_id=m.id LIMIT 1)
       )
       WHERE mm.user_id=$1 AND mm.mesa_id=$2 AND mm.member_role='jogador' AND mm.membership_status='active'
       LIMIT 1`,
      [studentId, mesaId, campaignId],
    ),
    pool.query(
      `SELECT name,sheet FROM gerusa.characters WHERE owner_user_id=$1 AND mesa_id=$2
         AND ($3::uuid IS NULL OR campaign_id=$3) LIMIT 1`,
      [studentId, mesaId, campaignId],
    ),
    pool.query(
      `SELECT title,scheduled_at AS "scheduledAt",objective,grammar,vocabulary,status
       FROM gerusa.lessons WHERE student_id=$1 AND mesa_id=$2 AND ($3::uuid IS NULL OR campaign_id=$3)
       ORDER BY scheduled_at DESC NULLS LAST LIMIT 5`,
      [studentId, mesaId, campaignId],
    ),
    pool.query(
      `SELECT l.title,l.objective,l.grammar,l.vocabulary,s.summary,s.started_at AS "startedAt",s.ended_at AS "endedAt"
           FROM gerusa.live_sessions s JOIN gerusa.lessons l ON l.id=s.lesson_id
          WHERE s.student_id=$1 AND s.mesa_id=$2 AND s.status='closed'
            AND ($3::uuid IS NULL OR l.campaign_id=$3)
          ORDER BY s.ended_at DESC LIMIT 5`,
      [studentId, mesaId, campaignId],
    ),
    pool.query(
      `SELECT r.record_type AS type,r.skill,r.progress_status AS status,r.observation,r.evidence,r.confirmed
       FROM gerusa.lesson_records r JOIN gerusa.lessons l ON l.id=r.lesson_id
       WHERE r.student_id=$1 AND r.mesa_id=$2 AND ($3::uuid IS NULL OR l.campaign_id=$3)
       ORDER BY r.created_at DESC LIMIT 20`,
      [studentId, mesaId, campaignId],
    ),
    pool.query(
      `SELECT task_type AS type,title,prompt,status,student_response AS response,teacher_feedback AS feedback
       FROM gerusa.assignments WHERE student_id=$1 AND mesa_id=$2 AND ($3::uuid IS NULL OR campaign_id=$3)
       ORDER BY created_at DESC LIMIT 8`,
      [studentId, mesaId, campaignId],
    ),
    lessonId
      ? pool.query(
          `SELECT id::text AS id,title,objective,grammar,vocabulary,outline,notes
       FROM gerusa.lessons WHERE id=$1 AND student_id=$2 AND mesa_id=$3
         AND ($4::uuid IS NULL OR campaign_id=$4) LIMIT 1`,
          [lessonId, studentId, mesaId, campaignId],
        )
      : Promise.resolve({ rows: [] }),
    lessonId
      ? pool.query(
          `SELECT a.title,a.premise,a.pedagogical_objective AS objective,a.grammar_target AS grammar,
              a.vocabulary,a.estimated_minutes AS duration,a.tone,a.difficulty,a.scenes,a.npcs,a.choices,
              a.challenges,a.english_questions AS questions,a.supports,a.conclusion,a.hook,a.suggested_task AS task
         FROM gerusa.adventures a JOIN gerusa.lessons l ON l.adventure_id=a.id
        WHERE l.id=$1 AND l.student_id=$2 AND l.mesa_id=$3
          AND ($4::uuid IS NULL OR l.campaign_id=$4) LIMIT 1`,
          [lessonId, studentId, mesaId, campaignId],
        )
      : Promise.resolve({ rows: [] }),
  ]);
  if (!profile.rowCount || !membership.rowCount) fail("student_forbidden", 404);
  if (lessonId && !lesson.rowCount) fail("lesson_not_found", 404);
  return {
    teacher: { name: user.displayName },
    student: profile.rows[0],
    context: membership.rows[0],
    character: character.rows[0] ?? null,
    recentLessons: lessons.rows,
    recentSessions: sessions.rows,
    records: records.rows,
    assignments: assignments.rows,
    lesson: lesson.rows[0] ?? null,
    adventure: adventure.rows[0] ?? null,
  };
}

async function teacherBody(pool, user, body) {
  const mesaId = optionalUuid(body.mesaId);
  const studentId = optionalUuid(body.studentId);
  if (!studentId) fail("student_required");
  await authorizeTeacherContext(pool, user.id, mesaId, studentId);
  const campaignId = optionalUuid(body.campaignId);
  await validateCampaign(pool, mesaId, campaignId);
  return { mesaId, studentId, campaignId };
}

async function saveLesson(pool, user, body) {
  const { mesaId, studentId, campaignId } = await teacherBody(pool, user, body);
  const id = optionalUuid(body.id);
  const adventureId = optionalUuid(body.adventureId);
  const assignmentId = optionalUuid(body.assignmentId);
  const title = text(body.title, 160) || "Aula de RPG";
  const status = LESSON_STATUSES.has(body.status) ? body.status : "draft";
  const duration = Number.isInteger(body.durationMinutes) ? body.durationMinutes : null;
  if (duration !== null && (duration < 5 || duration > 240)) fail("invalid_lesson_duration");
  const scheduledAt = text(body.scheduledAt, 60) || null;
  const objective = text(body.objective, 2000),
    grammar = text(body.grammar, 1000);
  const vocabulary = text(body.vocabulary, 2000),
    notes = text(body.notes, 4000);
  const outline = JSON.stringify(jsonArray(body.outline));
  if (adventureId) {
    const check = await pool.query(
      "SELECT campaign_id FROM gerusa.adventures WHERE id=$1 AND mesa_id=$2 AND student_id=$3",
      [adventureId, mesaId, studentId],
    );
    if (!check.rowCount) fail("adventure_not_found", 404);
    if (check.rows[0].campaign_id !== campaignId) fail("campaign_link_mismatch");
  }
  if (assignmentId) {
    const check = await pool.query(
      "SELECT campaign_id FROM gerusa.assignments WHERE id=$1 AND mesa_id=$2 AND student_id=$3",
      [assignmentId, mesaId, studentId],
    );
    if (!check.rowCount) fail("assignment_not_found", 404);
    if (check.rows[0].campaign_id !== campaignId) fail("campaign_link_mismatch");
  }
  if (id) {
    const result = await pool.query(
      `UPDATE gerusa.lessons SET campaign_id=$1,adventure_id=$2,assignment_id=$3,title=$4,scheduled_at=$5,
        status=$6,objective=$7,grammar=$8,vocabulary=$9,duration_minutes=$10,outline=$11::jsonb,notes=$12,updated_at=now()
       WHERE id=$13 AND mesa_id=$14 AND student_id=$15 RETURNING id::text AS id`,
      [
        campaignId,
        adventureId,
        assignmentId,
        title,
        scheduledAt,
        status,
        objective,
        grammar,
        vocabulary,
        duration,
        outline,
        notes,
        id,
        mesaId,
        studentId,
      ],
    );
    if (!result.rowCount) fail("lesson_not_found", 404);
    return { lessonId: result.rows[0].id };
  }
  const result = await pool.query(
    `INSERT INTO gerusa.lessons (created_by,student_id,mesa_id,campaign_id,adventure_id,assignment_id,title,
      scheduled_at,status,objective,grammar,vocabulary,duration_minutes,outline,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15) RETURNING id::text AS id`,
    [
      user.id,
      studentId,
      mesaId,
      campaignId,
      adventureId,
      assignmentId,
      title,
      scheduledAt,
      status,
      objective,
      grammar,
      vocabulary,
      duration,
      outline,
      notes,
    ],
  );
  return { lessonId: result.rows[0].id };
}

async function saveAdventure(pool, user, body) {
  const { mesaId, studentId, campaignId } = await teacherBody(pool, user, body);
  const id = optionalUuid(body.id),
    title = text(body.title, 160);
  if (!title) fail("adventure_title_required");
  const estimatedMinutes = Number.isInteger(body.estimatedMinutes) ? body.estimatedMinutes : null;
  if (estimatedMinutes !== null && (estimatedMinutes < 5 || estimatedMinutes > 240))
    fail("invalid_adventure_duration");
  const args = [
    user.id,
    studentId,
    mesaId,
    campaignId,
    title,
    text(body.premise),
    text(body.pedagogicalObjective, 2000),
    text(body.grammarTarget, 1000),
    JSON.stringify(jsonArray(body.vocabulary)),
    estimatedMinutes,
    text(body.tone, 300),
    text(body.difficulty, 300),
    JSON.stringify(jsonArray(body.scenes)),
    JSON.stringify(jsonArray(body.npcs)),
    JSON.stringify(jsonArray(body.choices)),
    JSON.stringify(jsonArray(body.challenges)),
    JSON.stringify(jsonArray(body.englishQuestions)),
    JSON.stringify(jsonArray(body.supports)),
    text(body.conclusion),
    text(body.hook),
    text(body.suggestedTask),
    id,
  ];
  const result = id
    ? await pool.query(
        `UPDATE gerusa.adventures SET campaign_id=$4,title=$5,premise=$6,pedagogical_objective=$7,grammar_target=$8,
         vocabulary=$9::jsonb,estimated_minutes=$10,tone=$11,difficulty=$12,scenes=$13::jsonb,npcs=$14::jsonb,
         choices=$15::jsonb,challenges=$16::jsonb,english_questions=$17::jsonb,supports=$18::jsonb,
         conclusion=$19,hook=$20,suggested_task=$21,updated_at=now()
         WHERE id=$22 AND mesa_id=$3 AND student_id=$2 RETURNING id::text AS id`,
        args,
      )
    : await pool.query(
        `INSERT INTO gerusa.adventures (created_by,student_id,mesa_id,campaign_id,title,premise,pedagogical_objective,
         grammar_target,vocabulary,estimated_minutes,tone,difficulty,scenes,npcs,choices,challenges,english_questions,
         supports,conclusion,hook,suggested_task)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb,
         $17::jsonb,$18::jsonb,$19,$20,$21) RETURNING id::text AS id`,
        args.slice(0, -1),
      );
  if (!result.rowCount) fail("adventure_not_found", 404);
  return { adventureId: result.rows[0].id };
}

async function saveCharacter(pool, user, body) {
  const mesaId = optionalUuid(body.mesaId),
    requestedOwner = optionalUuid(body.studentId);
  const ownerId = requestedOwner || user.id;
  if (ownerId === user.id) {
    if (!(await studentForMesa(pool, user.id, mesaId))) fail("mesa_forbidden", 404);
  } else await authorizeTeacherContext(pool, user.id, mesaId, ownerId);
  const campaignId = optionalUuid(body.campaignId);
  await validateCampaign(pool, mesaId, campaignId);
  const name = text(body.name, 100);
  if (!name) fail("character_name_required");
  const result = await pool.query(
    `INSERT INTO gerusa.characters (owner_user_id,mesa_id,campaign_id,name,sheet)
     VALUES ($1,$2,$3,$4,$5::jsonb)
     ON CONFLICT (owner_user_id,mesa_id) DO UPDATE SET campaign_id=EXCLUDED.campaign_id,
       name=EXCLUDED.name,sheet=EXCLUDED.sheet,updated_at=now()
     RETURNING id::text AS id,name,updated_at AS "updatedAt"`,
    [ownerId, mesaId, campaignId, name, JSON.stringify(jsonObject(body.sheet))],
  );
  return { character: result.rows[0] };
}

async function saveAssignment(pool, user, body) {
  const { mesaId, studentId, campaignId } = await teacherBody(pool, user, body);
  const id = optionalUuid(body.id),
    type = TASK_TYPES.has(body.taskType) ? body.taskType : "writing";
  const title = text(body.title, 160),
    prompt = text(body.prompt);
  if (!title || !prompt) fail("assignment_content_required");
  let lessonId = optionalUuid(body.lessonId);
  const liveSessionId = optionalUuid(body.liveSessionId);
  let adventureId = optionalUuid(body.adventureId);
  if (!campaignId || !liveSessionId) fail("assignment_context_required");
  const session = await pool.query(
    `SELECT s.lesson_id,s.adventure_id,l.campaign_id
       FROM gerusa.live_sessions s JOIN gerusa.lessons l ON l.id=s.lesson_id
      WHERE s.id=$1 AND s.mesa_id=$2 AND s.student_id=$3`,
    [liveSessionId, mesaId, studentId],
  );
  if (!session.rowCount) fail("live_session_not_found", 404);
  if (session.rows[0].campaign_id !== campaignId) fail("campaign_link_mismatch");
  if (lessonId && session.rows[0].lesson_id !== lessonId) fail("session_lesson_mismatch");
  lessonId ??= session.rows[0].lesson_id;
  if (adventureId && session.rows[0].adventure_id !== adventureId)
    fail("session_adventure_mismatch");
  adventureId ??= session.rows[0].adventure_id;
  if (lessonId) {
    const related = await pool.query(
      "SELECT campaign_id FROM gerusa.lessons WHERE id=$1 AND mesa_id=$2 AND student_id=$3",
      [lessonId, mesaId, studentId],
    );
    if (!related.rowCount) fail("lesson_not_found", 404);
    if (related.rows[0].campaign_id !== campaignId) fail("campaign_link_mismatch");
  }
  if (adventureId) {
    const related = await pool.query(
      "SELECT campaign_id FROM gerusa.adventures WHERE id=$1 AND mesa_id=$2 AND student_id=$3",
      [adventureId, mesaId, studentId],
    );
    if (!related.rowCount) fail("adventure_not_found", 404);
    if (related.rows[0].campaign_id !== campaignId) fail("campaign_link_mismatch");
  }
  const args = [
    user.id,
    studentId,
    mesaId,
    campaignId,
    lessonId,
    liveSessionId,
    adventureId,
    type,
    title,
    prompt,
    JSON.stringify(jsonObject(body.content)),
    text(body.dueAt, 60) || null,
    Boolean(body.allowResubmit),
    id,
  ];
  const result = id
    ? await pool.query(
        `UPDATE gerusa.assignments SET campaign_id=$3,lesson_id=$4,live_session_id=$5,adventure_id=$6,task_type=$7,title=$8,prompt=$9,
       content=$10::jsonb,due_at=$11,allow_resubmit=$12,updated_at=now()
       WHERE id=$13 AND mesa_id=$2 AND student_id=$1 AND status IN ('draft','published') RETURNING id::text AS id`,
        args.slice(1),
      )
    : await pool.query(
        `INSERT INTO gerusa.assignments (created_by,student_id,mesa_id,campaign_id,lesson_id,live_session_id,adventure_id,task_type,title,prompt,content,due_at,allow_resubmit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13) RETURNING id::text AS id`,
        args.slice(0, -1),
      );
  if (!result.rowCount) fail("assignment_not_found_or_locked", 404);
  return { assignmentId: result.rows[0].id };
}

export async function mutatePedagogy(pool, user, body) {
  const action = text(body.action, 60);
  if (action === "create_campaign") return saveCampaign(pool, user, body);
  if (action === "save_character") return saveCharacter(pool, user, body);
  if (action === "submit_assignment") {
    const requestedStudentId = optionalUuid(body.studentId);
    if (requestedStudentId && requestedStudentId.toLowerCase() !== user.id.toLowerCase())
      fail("assignment_not_available", 404);
    const id = optionalUuid(body.assignmentId),
      response = text(body.response, 12000);
    if (!id || !response) fail("assignment_response_required");
    const result = await pool.query(
      `UPDATE gerusa.assignments SET student_response=$1,submitted_at=now(),status='submitted',
         teacher_feedback=NULL,reviewed_at=NULL,updated_at=now()
       WHERE id=$2 AND student_id=$3 AND status IN ('published','submitted','reviewed')
         AND (status='published' OR allow_resubmit=true)
       RETURNING id::text AS id`,
      [response, id, user.id],
    );
    if (!result.rowCount) fail("assignment_not_available", 404);
    return { assignmentId: result.rows[0].id };
  }

  const { mesaId, studentId } = await teacherBody(pool, user, body);
  if (action === "save_lesson") return saveLesson(pool, user, body);
  if (action === "save_adventure") return saveAdventure(pool, user, body);
  if (action === "save_assignment") return saveAssignment(pool, user, body);
  if (action === "archive_adventure" || action === "reopen_adventure") {
    const adventureId = optionalUuid(body.adventureId);
    const status = action === "archive_adventure" ? "archived" : "active";
    const result = await pool.query(
      `UPDATE gerusa.adventures SET status=$1,updated_at=now()
       WHERE id=$2 AND mesa_id=$3 AND student_id=$4 RETURNING id::text AS id`,
      [status, adventureId, mesaId, studentId],
    );
    if (!result.rowCount) fail("adventure_not_found", 404);
    return { adventureId: result.rows[0].id, status };
  }

  if (action === "delete_lesson") {
    const id = optionalUuid(body.lessonId);
    const result = await pool.query(
      `DELETE FROM gerusa.lessons WHERE id=$1 AND mesa_id=$2 AND student_id=$3
       AND status IN ('draft','planned') AND NOT EXISTS (SELECT 1 FROM gerusa.live_sessions s WHERE s.lesson_id=gerusa.lessons.id)
       RETURNING id::text AS id`,
      [id, mesaId, studentId],
    );
    if (!result.rowCount) fail("lesson_cannot_be_deleted", 409);
    return { deleted: true };
  }
  if (["publish_assignment", "archive_assignment", "review_assignment"].includes(action)) {
    const id = optionalUuid(body.assignmentId);
    const change =
      action === "publish_assignment"
        ? {
            sql: "UPDATE gerusa.assignments SET status='published',updated_at=now() WHERE id=$1 AND mesa_id=$2 AND student_id=$3 AND status='draft'",
            values: [id, mesaId, studentId],
          }
        : action === "archive_assignment"
          ? {
              sql: "UPDATE gerusa.assignments SET status='archived',updated_at=now() WHERE id=$1 AND mesa_id=$2 AND student_id=$3 AND status<>'archived'",
              values: [id, mesaId, studentId],
            }
          : {
              sql: "UPDATE gerusa.assignments SET teacher_feedback=$1,status='reviewed',reviewed_at=now(),updated_at=now() WHERE id=$2 AND mesa_id=$3 AND student_id=$4 AND status='submitted'",
              values: [text(body.feedback), id, mesaId, studentId],
            };
    if (action === "review_assignment" && !text(body.feedback)) fail("feedback_required");
    const result = await pool.query(`${change.sql} RETURNING id::text AS id`, change.values);
    if (!result.rowCount) fail("assignment_not_found_or_locked", 404);
    return { assignmentId: result.rows[0].id };
  }
  if (action === "start_session") {
    const lessonId = optionalUuid(body.lessonId);
    if (!lessonId) fail("lesson_required");
    const lesson = await pool.query(
      `SELECT id,adventure_id FROM gerusa.lessons WHERE id=$1 AND mesa_id=$2 AND student_id=$3 AND status IN ('draft','planned')`,
      [lessonId, mesaId, studentId],
    );
    if (!lesson.rowCount) fail("lesson_not_found", 404);
    const existing = await pool.query(
      `SELECT id::text AS id,started_at AS "startedAt" FROM gerusa.live_sessions
       WHERE lesson_id=$1 AND status='live'`,
      [lessonId],
    );
    if (existing.rowCount)
      return { sessionId: existing.rows[0].id, startedAt: existing.rows[0].startedAt };
    const result = await pool.query(
      `INSERT INTO gerusa.live_sessions (lesson_id,created_by,student_id,mesa_id,adventure_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING id::text AS id,started_at AS "startedAt"`,
      [lessonId, user.id, studentId, mesaId, lesson.rows[0].adventure_id],
    );
    return { sessionId: result.rows[0].id, startedAt: result.rows[0].startedAt };
  }
  if (action === "update_session") {
    const id = optionalUuid(body.sessionId);
    const result = await pool.query(
      `UPDATE gerusa.live_sessions SET quick_notes=$1,current_scene_index=$2,updated_at=now()
       WHERE id=$3 AND mesa_id=$4 AND student_id=$5 AND status='live' RETURNING id::text AS id`,
      [
        text(body.quickNotes, 4000),
        Number.isInteger(body.currentSceneIndex) ? Math.max(0, body.currentSceneIndex) : 0,
        id,
        mesaId,
        studentId,
      ],
    );
    if (!result.rowCount) fail("live_session_not_found", 404);
    return { sessionId: result.rows[0].id };
  }
  if (action === "save_summary") {
    const id = optionalUuid(body.sessionId),
      summary = jsonObject(body.summary);
    const result = await pool.query(
      `UPDATE gerusa.live_sessions SET summary=$1::jsonb,updated_at=now()
       WHERE id=$2 AND mesa_id=$3 AND student_id=$4 AND status='live' RETURNING id::text AS id`,
      [JSON.stringify(summary), id, mesaId, studentId],
    );
    if (!result.rowCount) fail("live_session_not_found", 404);
    return { sessionId: result.rows[0].id };
  }
  if (action === "close_session") {
    const id = optionalUuid(body.sessionId),
      summary = jsonObject(body.summary);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const closed = await client.query(
        `UPDATE gerusa.live_sessions SET status='closed',ended_at=now(),summary=$1::jsonb,updated_at=now()
         WHERE id=$2 AND mesa_id=$3 AND student_id=$4 AND status='live' RETURNING lesson_id::text AS "lessonId"`,
        [JSON.stringify(summary), id, mesaId, studentId],
      );
      if (!closed.rowCount) {
        await client.query("ROLLBACK");
        fail("live_session_not_found", 404);
      }
      await client.query(
        "UPDATE gerusa.lessons SET status='completed',updated_at=now() WHERE id=$1",
        [closed.rows[0].lessonId],
      );
      await client.query("COMMIT");
      return { sessionId: id, lessonId: closed.rows[0].lessonId };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
  if (action === "record_observation" || action === "save_progress") {
    const lessonId = optionalUuid(body.lessonId),
      sessionId = optionalUuid(body.sessionId);
    const type = action === "save_progress" ? "progress" : text(body.recordType, 40);
    if (!RECORD_TYPES.has(type)) fail("invalid_record_type");
    const observation = text(body.observation);
    if (!observation) fail("observation_required");
    const progressStatus =
      action === "save_progress" && PROGRESS_STATUSES.has(body.progressStatus)
        ? body.progressStatus
        : null;
    if (action === "save_progress" && !progressStatus) fail("invalid_progress_status");
    const lesson = await pool.query(
      `SELECT 1 FROM gerusa.lessons WHERE id=$1 AND mesa_id=$2 AND student_id=$3`,
      [lessonId, mesaId, studentId],
    );
    if (!lesson.rowCount) fail("lesson_not_found", 404);
    if (
      sessionId &&
      !(
        await pool.query(
          "SELECT 1 FROM gerusa.live_sessions WHERE id=$1 AND lesson_id=$2 AND mesa_id=$3 AND student_id=$4 AND status='live'",
          [sessionId, lessonId, mesaId, studentId],
        )
      ).rowCount
    )
      fail("live_session_not_found", 404);
    const result = await pool.query(
      `INSERT INTO gerusa.lesson_records (created_by,student_id,mesa_id,lesson_id,live_session_id,record_type,skill,progress_status,observation,evidence,confirmed)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id::text AS id`,
      [
        user.id,
        studentId,
        mesaId,
        lessonId,
        sessionId,
        type,
        text(body.skill, 100),
        progressStatus,
        observation,
        text(body.evidence),
        action === "save_progress" && body.confirmed === true,
      ],
    );
    return { recordId: result.rows[0].id };
  }
  fail("unknown_pedagogy_action");
}
