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
	public Student savestudent(Student s)
	{
		return repo.save(s);
		
	}

	public Student getstudentbyid(int id)
	{
		return repo.findById(id).orElse(null);
		
	}
	public Student updateStudent(Student s)
	{
		return repo.save(s);
	}
	public void deleteStudent(int id)
	{
		repo.deleteById(id);
	}
	public List<Student> getAllStudents() {
		// TODO Auto-generated method stub
		return repo.findAll();
	}

}
