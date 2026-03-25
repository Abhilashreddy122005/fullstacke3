package com.example.demo.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.model.Product;
import com.example.demo.service.ProductService;

@RestController
@RequestMapping("/products")
public class ProductController {
	private final ProductService service;

	public ProductController(ProductService service) {
		this.service = service;
	}
	@GetMapping("/{id}")
	public Product getProduct(@PathVariable int id){
		return service.getProduct(id);
	}
	@GetMapping("/")
	public List<Product> getAllProducts(){
		return service.getAllProducts();
	}
	@PostMapping("/")
	public Product addProduct(@RequestBody Product p) {
		return service.saveProduct(p);
	}
	@PutMapping("/{id}")
	public Product updateProduct(@RequestBody Product p) {
		return service.saveProduct(p);
	}
	@DeleteMapping("/{id}")
	public String deleteProduct(@PathVariable int id) {
		service.deleteProduct(id);
		return " Product deleted successfully";
	}
}
