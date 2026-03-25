package com.example.demo.Service;

import java.util.List;
import org.springframework.stereotype.Service;
import com.example.demo.Repository.StudentRepository;
import com.example.demo.model.Student;

@Service
public class StudentService {
    private final StudentRepository repo;

    public StudentService(StudentRepository repo) {
        this.repo = repo;
    }

    // Save student
    public Student saveStudent(Student s) {
        return repo.save(s);
    }

    // Get all students
    public List<Student> getAllStudents() {
        return repo.findAll();
    }

    // Get student by id
    public Student getStudent(int id) {
        return repo.findById(id).orElse(null);
    }

    // Update student
    public Student updateStudent(Student s) {
        return repo.save(s);
    }

    // Delete student
    public void deleteStudent(int id) {
        repo.deleteById(id);
    }

    // Find by department
    public List<Student> getStudentsByDepartment(String dept) {
        return repo.findByDept(dept);
    }

    // Find by age
    public List<Student> getStudentsByAge(int age) {
        return repo.findByAge(age);
    }

    // Find age greater than
    public List<Student> getStudentsGreaterThan(int age) {
        return repo.findByAgeGreaterThan(age);
    }

    // Find by department and age
    public List<Student> getStudentsByDepartmentAndAge(String dept, int age) {
        return repo.findByDeptAndAge(dept, age);
    }
}