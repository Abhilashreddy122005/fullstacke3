package com.example.demo.Repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.demo.model.Student;

public interface StudentRepository extends JpaRepository<Student, Integer> {
    // Find students by department
    List<Student> findByDept(String department);

    // Find students by age
    List<Student> findByAge(int age);

    // Find students with age greater than
    List<Student> findByAgeGreaterThan(int age);

    // Find students by department and age
    List<Student> findByDeptAndAge(String department, int age);
}