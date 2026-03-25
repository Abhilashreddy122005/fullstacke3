
package com.example.task9.controller;

import com.example.task9.model.Employee;
import com.example.task9.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
public class EmployeeController {

    @Autowired
    private EmployeeRepository repo;

    @GetMapping("/")
    public String searchPage(){
        return "search";
    }

    @PostMapping("/search")
    public String searchEmployee(@RequestParam int id, Model model){

        Employee emp = repo.findById(id);

        if(emp==null){
            model.addAttribute("error","Employee doesn't exist");
            return "result";
        }

        model.addAttribute("emp",emp);
        return "result";
    }
}
