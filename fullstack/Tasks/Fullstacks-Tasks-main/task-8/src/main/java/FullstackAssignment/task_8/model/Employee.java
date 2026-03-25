package FullstackAssignment.task_8.model;

public class Employee {
	private int id;
	private String name;
	private String dept;
	
	public Employee(int id, String name, String dept) {
		// TODO Auto-generated constructor stub
		this.id = id;
		this.name = name;
		this.dept = dept;
	}
	@Override
	public String toString() {
		return "Employee [id=" + id + ", name=" + name + ", dept=" + dept + "]";
	}
	
}
