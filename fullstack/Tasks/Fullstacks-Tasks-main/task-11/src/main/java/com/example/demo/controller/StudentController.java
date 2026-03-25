package com.example.demo.controller;

import java.util.List;
import org.springframework.web.bind.annotation.*;
import com.example.demo.Service.StudentService;
import com.example.demo.model.Student;

@RestController
@RequestMapping("/students")
public class StudentController {
    private final StudentService service;

    public StudentController(StudentService service) {
        this.service = service;
    }

    @GetMapping("/dept/{dept}")
    public List<Student> getByDept(@PathVariable String dept) {
        return service.getStudentsByDepartment(dept);
    }

    @GetMapping("/age/{age}")
    public List<Student> getByAge(@PathVariable int age) {
        return service.getStudentsByAge(age);
    }

    @GetMapping("/agegreater/{age}")
    public List<Student> getByAgeGreaterThan(@PathVariable int age) {
        return service.getStudentsGreaterThan(age);
    }

    @GetMapping("/filter/{dept}/{age}")
    public List<Student> getByAgeAndDept(@PathVariable String dept, @PathVariable int age) {
        return service.getStudentsByDepartmentAndAge(dept, age);
    }

    @PostMapping
    public Student addStudent(@RequestBody Student s) {
        return service.saveStudent(s);
    }

    @PutMapping
    public Student updateStudent(@RequestBody Student s) {
        return service.updateStudent(s);
    }

    @DeleteMapping("/{id}")
    public void deleteStudent(@PathVariable int id) {
        service.deleteStudent(id);
    }

    @GetMapping
    public List<Student> getAllStudents() {
        return service.getAllStudents();
    }
}