package com.studyflow.common.config;

import com.studyflow.academic.domain.Semester;
import com.studyflow.academic.domain.SemesterRepository;
import com.studyflow.academic.domain.SemesterStatus;
import com.studyflow.academic.domain.Subject;
import com.studyflow.academic.domain.SubjectRepository;
import com.studyflow.common.security.UserRole;
import com.studyflow.user.domain.User;
import com.studyflow.user.domain.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@Profile("dev")
public class DevDataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;
    private final SemesterRepository semesterRepository;
    private final PasswordEncoder passwordEncoder;

    public DevDataInitializer(UserRepository userRepository,
                              SubjectRepository subjectRepository,
                              SemesterRepository semesterRepository,
                              PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.subjectRepository = subjectRepository;
        this.semesterRepository = semesterRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // Seed users
        if (!userRepository.existsByEmail("teacher@ptit.edu.vn")) {
            userRepository.save(new User(
                    "usr_teacher_01",
                    "teacher@ptit.edu.vn",
                    "teacher_ptit",
                    passwordEncoder.encode("ptit@demo123"),
                    "TS. Nguyễn Văn Hùng",
                    "Asia/Ho_Chi_Minh",
                    UserRole.TEACHER,
                    "ACTIVE"
            ));
        }

        if (!userRepository.existsByEmail("student@ptit.edu.vn")) {
            userRepository.save(new User(
                    "usr_student_01",
                    "student@ptit.edu.vn",
                    "student_ptit",
                    passwordEncoder.encode("ptit@demo123"),
                    "Trần Hoàng Nam",
                    "Asia/Ho_Chi_Minh",
                    UserRole.STUDENT,
                    "ACTIVE"
            ));
        }

        if (!userRepository.existsByEmail("admin@ptit.edu.vn")) {
            userRepository.save(new User(
                    "usr_admin_01",
                    "admin@ptit.edu.vn",
                    "admin_ptit",
                    passwordEncoder.encode("ptit@demo123"),
                    "Hệ Thống PTIT Admin",
                    "Asia/Ho_Chi_Minh",
                    UserRole.ADMIN,
                    "ACTIVE"
            ));
        }

        // Seed semesters
        if (semesterRepository.count() == 0) {
            semesterRepository.save(new Semester(
                    "sem_2026_1",
                    "2026_1",
                    "Học kỳ 1 · Năm học 2026 - 2027",
                    "2026-2027",
                    LocalDate.of(2026, 9, 1),
                    LocalDate.of(2027, 1, 15),
                    SemesterStatus.ACTIVE,
                    true
            ));
            semesterRepository.save(new Semester(
                    "sem_2026_2",
                    "2026_2",
                    "Học kỳ 2 · Năm học 2026 - 2027",
                    "2026-2027",
                    LocalDate.of(2027, 2, 1),
                    LocalDate.of(2027, 6, 30),
                    SemesterStatus.UPCOMING,
                    false
            ));
        }

        // Seed subjects
        if (subjectRepository.count() == 0) {
            subjectRepository.save(new Subject(
                    "subj_dbi",
                    "INT1340",
                    "Cơ sở dữ liệu",
                    3,
                    "Học phần nền tảng về thiết kế mô hình dữ liệu quan hệ, SQL và tối ưu hóa truy vấn.",
                    "ACTIVE"
            ));
            subjectRepository.save(new Subject(
                    "subj_dsa",
                    "INT1339",
                    "Cấu trúc dữ liệu và giải thuật",
                    3,
                    "Học phần cung cấp kiến thức giải thuật sắp xếp, tìm kiếm, cây, đồ thị và độ phức tạp.",
                    "ACTIVE"
            ));
            subjectRepository.save(new Subject(
                    "subj_oop",
                    "INT1332",
                    "Lập trình hướng đối tượng",
                    3,
                    "Học phần trang bị tư duy hướng đối tượng với Java: Encapsulation, Inheritance, Polymorphism.",
                    "ACTIVE"
            ));
        }
    }
}
