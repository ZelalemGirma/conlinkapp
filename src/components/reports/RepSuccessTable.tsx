import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

interface RepSuccessRow {
  rep: string;
  assigned: number;
  closed: number;
  rate: number;
}

interface RepSuccessTableProps {
  data: RepSuccessRow[];
}

const RepSuccessTable: React.FC<RepSuccessTableProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Success Rate by Rep</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Rep</TableHead>
              <TableHead className="text-xs text-right">Assigned</TableHead>
              <TableHead className="text-xs text-right">Closed</TableHead>
              <TableHead className="text-xs">Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                  No data
                </TableCell>
              </TableRow>
            ) : (
              data.map(row => (
                <TableRow key={row.rep}>
                  <TableCell className="text-xs font-medium">{row.rep}</TableCell>
                  <TableCell className="text-xs text-right">{row.assigned}</TableCell>
                  <TableCell className="text-xs text-right">{row.closed}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={row.rate} className="h-2 flex-1" />
                      <span className="text-xs font-medium w-10 text-right">{row.rate.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default RepSuccessTable;
