
package com.example.task9.repository;

import com.example.task9.model.Employee;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

@Repository
public class EmployeeRepository {

    private List<Employee> list=new ArrayList<>();

    public EmployeeRepository(){
        list.add(new Employee(101,"Naveen","CSE"));
        list.add(new Employee(102,"nagin","ECE"));
        list.add(new Employee(103,"nayan","IT"));
    }

    public Employee findById(int id){
        for(Employee e:list){
            if(e.getId()==id){
                return e;
            }
        }
        return null;
    }
}
