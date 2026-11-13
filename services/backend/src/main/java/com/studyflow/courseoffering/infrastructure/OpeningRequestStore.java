package com.studyflow.courseoffering.infrastructure;

import com.studyflow.courseoffering.dto.OpeningRequestModels.*;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** App-only persistence with bound parameters and request-row locking for a single approval. */
@Repository
public class OpeningRequestStore {
    private final JdbcTemplate jdbc;
    private static final String SELECT = """
        SELECT r.*, u.full_name AS teacher_name, s.name AS semester_name
        FROM app.course_opening_requests r JOIN app.users u ON u.id=r.teacher_id
        JOIN app.semesters s ON s.id=r.semester_id
        """;
    /** Args: application JDBC connection. Output: store. Errors: none. */
    public OpeningRequestStore(JdbcTemplate jdbc) { this.jdbc=jdbc; }

    /** Args: ID and lock flag. Input: application transaction when locking. Returns: optional request.
     * Errors: database failures. Lock is held until caller transaction completes. */
    public Optional<OpeningRequest> find(UUID id, boolean lock) {
        return jdbc.query(SELECT+" WHERE r.id=?"+(lock ? " FOR UPDATE OF r" : ""), OpeningRequestStore::row, id).stream().findFirst();
    }

    /** Args: optional owner/status filter and validated page/size. Output: bounded metadata page.
     * Errors: database failures; all filter values use bound parameters. */
    public Page list(UUID teacherId, String status, int page, int size) {
        String filter=" WHERE 1=1";
        List<Object> args=new ArrayList<>();
        if(teacherId!=null) { filter+=" AND r.teacher_id=?"; args.add(teacherId); }
        if(status!=null) { filter+=" AND r.status=?"; args.add(status); }
        Long count=jdbc.queryForObject("SELECT count(*) FROM app.course_opening_requests r"+filter,Long.class,args.toArray());
        args.add(size); args.add((long)page*size);
        List<OpeningRequest> items=jdbc.query(SELECT+filter+" ORDER BY r.created_at DESC,r.id LIMIT ? OFFSET ?",OpeningRequestStore::row,args.toArray());
        long total=count==null ? 0 : count;
        return new Page(items,page,size,total,(int)((total+size-1)/size));
    }

    /** Args: normalized proposal/owner/ID/time. Output: void; inserts PENDING without any course or Subject.
     * Errors: duplicate pending request or invalid FK causes persistence exception. */
    public void insert(UUID id, UUID teacherId, Submit input, Instant now) {
        jdbc.update("""
            INSERT INTO app.course_opening_requests
            (id,teacher_id,subject_code,subject_name,credits,semester_id,code,name,status,created_at)
            VALUES (?,?,?,?,?,?,?,?,'PENDING',?)
            """,id,teacherId,input.subjectCode(),input.subjectName(),input.credits(),input.semesterId(),input.code(),input.name(),Timestamp.from(now));
    }

    /** Args: locked request, decision actor, result/status/reason and time.
     * Output: void; conditional terminal decision. Errors: lost/previous decision raises IllegalStateException. */
    public void decide(UUID id, UUID adminId, UUID offeringId, String status, String reason, Instant now) {
        int changed=jdbc.update("""
            UPDATE app.course_opening_requests SET status=?,course_offering_id=?,decided_by=?,decision_reason=?,decided_at=?
            WHERE id=? AND status='PENDING'
            """,status,offeringId,adminId,reason,Timestamp.from(now),id);
        if(changed!=1) throw new IllegalStateException("Opening request decision was not applied");
    }

    /** Args: Teacher ID. Output: active TEACHER existence. Errors: database failures. */
    public boolean activeTeacher(UUID id) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM app.users WHERE id=? AND role='TEACHER' AND status='ACTIVE')",Boolean.class,id));
    }

    /** Args: JDBC result and row index. Output: safe metadata. Errors: SQLException on invalid row. */
    private static OpeningRequest row(ResultSet rs,int index) throws SQLException {
        Timestamp decided=rs.getTimestamp("decided_at");
        return new OpeningRequest(rs.getObject("id",UUID.class),rs.getObject("teacher_id",UUID.class),rs.getString("teacher_name"),
            rs.getString("subject_code"),rs.getString("subject_name"),rs.getInt("credits"),rs.getObject("semester_id",UUID.class),
            rs.getString("semester_name"),rs.getString("code"),rs.getString("name"),rs.getString("status"),
            rs.getObject("course_offering_id",UUID.class),rs.getString("decision_reason"),rs.getTimestamp("created_at").toInstant(),decided==null?null:decided.toInstant());
    }
}
