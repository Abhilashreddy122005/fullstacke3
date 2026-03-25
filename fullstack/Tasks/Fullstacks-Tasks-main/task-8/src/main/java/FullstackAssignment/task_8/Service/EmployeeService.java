package FullstackAssignment.task_8.Service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import FullstackAssignment.task_8.Repository.EmployeeRepository;
import FullstackAssignment.task_8.model.Employee;
@Component
public class EmployeeService {
	@Autowired
	private EmployeeRepository er;
	public void createEmployee(int id,String name,String dept)
	{
		Employee emp=new Employee(id,name,dept);
		er.addEmployee(emp);
		
	}
	public List<Employee> fetchAllEmployees()
	{
		return er.getAllEmployees();
		
	}
}
