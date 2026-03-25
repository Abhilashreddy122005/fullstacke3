package FullstackAssignment.task_8.Repository;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

import FullstackAssignment.task_8.model.Employee;
@Component
public class EmployeeRepository {
	private List<Employee> el=new ArrayList<>();
	
	public List<Employee> getAllEmployees()
	{
		return el;
	}
	public void addEmployee(Employee emp) {
		// TODO Auto-generated method stub
		el.add(emp);
		
	}
	

}
