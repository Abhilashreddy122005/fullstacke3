package com.example.demo.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.example.demo.model.Product;
import com.example.demo.repository.Productrepo;


@Service
public class ProductService {
	private final Productrepo repo;

	public ProductService(Productrepo repo) {
		this.repo = repo;
	}
	public Product saveProduct(Product p) {
		repo.save(p);
		return p;
	}
	public List<Product> getAllProducts(){
		return repo.findAll();
	}
	public Product getProduct(int id) {
		return repo.findById(id).orElse(null);
	}
	public Product UpdateProduct(Product p) {
		return repo.save(p);
	}
	public void deleteProduct(int id) {
		repo.deleteById(id);
	}
}
	
