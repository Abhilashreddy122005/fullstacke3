package com.example.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.model.Product;

public interface Productrepo extends JpaRepository<Product,Integer>{
	
	
}
