package FullstackAssignment.task_8;

import org.springframework.beans.factory.BeanFactory;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

import FullstackAssignment.task_8.Service.EmployeeService;
import FullstackAssignment.task_8.config.AppConfig;

/**
 * Hello world!
 *
 */
public class App 
{
    public static void main( String[] args )
    {
    	
        BeanFactory factory=new AnnotationConfigApplicationContext(AppConfig.class);
        EmployeeService service=factory.getBean(EmployeeService.class);
        service.createEmployee(101,"Raja","IT");
        service.createEmployee(102,"Naveen","CSE");
        service.createEmployee(103,"Reddy","ECE");
        service.fetchAllEmployees().forEach(System.out::println);
    }
}
