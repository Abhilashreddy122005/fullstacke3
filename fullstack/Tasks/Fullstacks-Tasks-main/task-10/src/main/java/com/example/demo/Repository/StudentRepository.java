package com.example.demo.Repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.model.Student;


public interface StudentRepository extends JpaRepository<Student,Integer>{
	
}
